import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import * as Y from 'yjs';

export const suggestedRooms = ['General', 'Planning', 'Design Review'];
const PERSONAL_DOCS_KEY = 'syncroom_personal_documents';
const PERSONAL_ACTIVE_KEY = 'syncroom_personal_active_document';

const getSavedDocuments = () => {
  try {
    const stored = localStorage.getItem(PERSONAL_DOCS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const getNextDocumentTitle = (documents = []) => {
  let maxNumber = 0;

  documents.forEach((doc) => {
    const match = /^Document\s+(\d+)$/i.exec(doc.title || '');
    if (match) {
      maxNumber = Math.max(maxNumber, Number(match[1]));
    }
  });

  return `Document ${maxNumber + 1}`;
};

const useWorkspaceState = () => {
  const [message, setMessage] = useState('');
  const [socket, setSocket] = useState(null);

  const [isSomeoneTyping, setIsSomeoneTyping] = useState(false);
  const [typerName, setTyperName] = useState('');

  const [nameInput, setNameInput] = useState('');
  const [onlineCount, setOnlineCount] = useState(0);
  const [userName, setUserName] = useState(
    () => localStorage.getItem('userName') || ''
  );

  const [roomInput, setRoomInput] = useState('');
  const [currentRoom, setCurrentRoom] = useState(
    () => localStorage.getItem('currentRoom') || ''
  );
  const [personalMode, setPersonalMode] = useState(false);
  const [savedDocuments, setSavedDocuments] = useState(() => getSavedDocuments());
  const [activeDocumentId, setActiveDocumentId] = useState(
    () => localStorage.getItem(PERSONAL_ACTIVE_KEY) || ''
  );
  const [docTitle, setDocTitle] = useState('Untitled document');
  const [activeUsersList, setActiveUsersList] = useState([]);

  const ydocRef = useRef(null);
  const ytextRef = useRef(null);
  const currentRoomRef = useRef(currentRoom);
  const resetYDocRef = useRef(() => {});

  const isTypingLocally = useRef(false);
  const typingTimeout = useRef(null);

  const sessionId = useRef(
    localStorage.getItem('sessionId') || crypto.randomUUID()
  );

  useEffect(() => {
    localStorage.setItem('sessionId', sessionId.current);
  }, []);

  useEffect(() => {
    currentRoomRef.current = currentRoom;
  }, [currentRoom]);

  useEffect(() => {
    if (!userName) return;

    const socketInstance = io('http://localhost:3500', {
      transports: ['websocket'],
      auth: {
        username: userName,
        sessionId: sessionId.current,
      },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    setSocket(socketInstance);

    let activeYDoc = null;
    let activeYText = null;

    const handleYTextChange = () => {
      const currentYText = ytextRef.current;
      if (!currentYText) return;
      setMessage(currentYText.toString());
    };

    const handleYUpdate = (update, origin) => {
      if (origin === 'remote') return;

      const room = currentRoomRef.current;
      if (!socketInstance.connected || !room) return;

      socketInstance.emit('yjs_update', {
        room,
        update: Array.from(update),
      });
    };

    const resetLocalYDoc = () => {
      if (activeYText) {
        activeYText.unobserve(handleYTextChange);
      }
      if (activeYDoc) {
        activeYDoc.off('update', handleYUpdate);
        activeYDoc.destroy();
      }

      const nextYDoc = new Y.Doc();
      const nextYText = nextYDoc.getText('editor');

      nextYText.observe(handleYTextChange);
      nextYDoc.on('update', handleYUpdate);

      activeYDoc = nextYDoc;
      activeYText = nextYText;
      ydocRef.current = nextYDoc;
      ytextRef.current = nextYText;

      setMessage('');
    };

    resetYDocRef.current = resetLocalYDoc;
    resetLocalYDoc();

    socketInstance.on('yjs_update', (update) => {
      const currentYDoc = ydocRef.current;
      if (!currentYDoc) return;
      const binaryUpdate = new Uint8Array(update);
      Y.applyUpdate(currentYDoc, binaryUpdate, 'remote');
    });

    socketInstance.on('yjs_sync', (update) => {
      const currentYDoc = ydocRef.current;
      if (!currentYDoc) return;
      const binaryUpdate = new Uint8Array(update);
      Y.applyUpdate(currentYDoc, binaryUpdate, 'remote');
    });

    socketInstance.on('connect', () => {
      const savedRoom = localStorage.getItem('currentRoom');
      if (savedRoom) {
        setCurrentRoom(savedRoom);
        socketInstance.emit('join_room', savedRoom);
      }
    });

    socketInstance.on('room_users_list', (namesArray) => {
      setActiveUsersList(namesArray);
    });

    socketInstance.on('room_user_count', (count) => {
      setOnlineCount(count);
    });

    socketInstance.on('user_typing', (data) => {
      setTyperName(data.username);
      setIsSomeoneTyping(data.isTyping);
    });

    socketInstance.on('disconnect', () => {});
    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    return () => {
      socketInstance.disconnect();

      if (activeYText) {
        activeYText.unobserve(handleYTextChange);
      }
      if (activeYDoc) {
        activeYDoc.off('update', handleYUpdate);
        activeYDoc.destroy();
      }
      resetYDocRef.current = () => {};

      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
      }
    };
  }, [userName]);

  const handleSetName = (e) => {
    e.preventDefault();
    const trimmedName = nameInput.trim();
    if (!trimmedName) return;

    localStorage.setItem('userName', trimmedName);
    setUserName(trimmedName);
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    const trimmedRoom = roomInput.trim();

    if (!trimmedRoom || !socket) return;

    resetYDocRef.current();
    setPersonalMode(false);
    setCurrentRoom(trimmedRoom);
    localStorage.setItem('currentRoom', trimmedRoom);
    socket.emit('join_room', trimmedRoom);
  };

  const hydrateLocalDocument = (content = '') => {
    const currentYText = ytextRef.current;
    const currentYDoc = ydocRef.current;

    if (!currentYText || !currentYDoc) return;

    currentYDoc.transact(() => {
      if (currentYText.length > 0) {
        currentYText.delete(0, currentYText.length);
      }
      if (content) {
        currentYText.insert(0, content);
      }
    }, 'local');

    setMessage(content);
  };

  const persistSavedDocuments = (documents) => {
    localStorage.setItem(PERSONAL_DOCS_KEY, JSON.stringify(documents));
    setSavedDocuments(documents);
  };

  const saveCurrentPersonalDocument = (nextTitle, nextContent, documentId = activeDocumentId) => {
    const trimmedTitle = (nextTitle || '').trim() || 'Untitled document';
    const documents = getSavedDocuments();

    const existingIndex = documents.findIndex((doc) => doc.id === documentId);
    const nextDocument = {
      id: documentId || crypto.randomUUID(),
      title: trimmedTitle,
      content: nextContent,
      updatedAt: new Date().toISOString(),
    };

    let updatedDocuments;
    if (existingIndex >= 0) {
      updatedDocuments = documents.map((doc) =>
        doc.id === documentId
          ? { ...doc, title: trimmedTitle, content: nextContent, updatedAt: nextDocument.updatedAt }
          : doc
      );
    } else {
      updatedDocuments = [nextDocument, ...documents];
    }

    persistSavedDocuments(updatedDocuments);
    setActiveDocumentId(nextDocument.id);
    localStorage.setItem(PERSONAL_ACTIVE_KEY, nextDocument.id);
    return nextDocument.id;
  };

  const handleCreateNewPersonalDocument = () => {
    const nextTitle = getNextDocumentTitle(getSavedDocuments());
    const draftId = crypto.randomUUID();
    const newDocument = {
      id: draftId,
      title: nextTitle,
      content: '',
      updatedAt: new Date().toISOString(),
    };

    const nextDocuments = [newDocument, ...getSavedDocuments()];
    persistSavedDocuments(nextDocuments);

    setDocTitle(nextTitle);
    setActiveDocumentId(draftId);
    localStorage.setItem(PERSONAL_ACTIVE_KEY, draftId);
    localStorage.removeItem('currentRoom');
    setCurrentRoom('');
    setPersonalMode(true);
    setActiveUsersList([]);
    setOnlineCount(0);
    setMessage('');
    resetYDocRef.current();
    setIsSomeoneTyping(false);
    setTyperName('');
    hydrateLocalDocument('');
  };

  const getTextDifference = (oldText, newText) => {
    let start = 0;

    while (
      start < oldText.length &&
      start < newText.length &&
      oldText[start] === newText[start]
    ) {
      start += 1;
    }

    let oldEnd = oldText.length - 1;
    let newEnd = newText.length - 1;

    while (
      oldEnd >= start &&
      newEnd >= start &&
      oldText[oldEnd] === newText[newEnd]
    ) {
      oldEnd -= 1;
      newEnd -= 1;
    }

    const deleteCount = oldEnd >= start ? oldEnd - start + 1 : 0;
    const insertText = newEnd >= start ? newText.slice(start, newEnd + 1) : '';

    return { index: start, deleteCount, insertText };
  };

  const handleChange = (e) => {
    const newValue = e.target.value;
    const ytext = ytextRef.current;

    if (!ytext) {
      setMessage(newValue);
      if (personalMode) {
        saveCurrentPersonalDocument(docTitle, newValue, activeDocumentId || undefined);
      }
      return;
    }

    const oldValue = ytext.toString();
    const { index, deleteCount, insertText } = getTextDifference(oldValue, newValue);

    ydocRef.current.transact(() => {
      if (deleteCount > 0) {
        ytext.delete(index, deleteCount);
      }
      if (insertText) {
        ytext.insert(index, insertText);
      }
    }, 'local');

    if (personalMode) {
      saveCurrentPersonalDocument(docTitle, newValue, activeDocumentId || undefined);
    }

    if (socket && currentRoom) {
      if (!isTypingLocally.current) {
        isTypingLocally.current = true;
        socket.emit('typing', { room: currentRoom, username: userName });
      }
      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
      }

      typingTimeout.current = setTimeout(() => {
        socket.emit('stop_typing', { room: currentRoom, username: userName });
        isTypingLocally.current = false;
      }, 1500);
    }
  };

  useEffect(() => {
    if (personalMode && docTitle.trim()) {
      saveCurrentPersonalDocument(docTitle, message, activeDocumentId || undefined);
    }
  }, [docTitle, personalMode]);

  const handleLeaveRoom = () => {
    if (!socket && !personalMode && !currentRoom) return;

    resetYDocRef.current();

    if (socket && currentRoom) {
      socket.emit('leave_room', currentRoom);
    }

    setCurrentRoom('');
    setPersonalMode(false);
    setMessage('');
    setActiveUsersList([]);
    setOnlineCount(0);
    setIsSomeoneTyping(false);
    setTyperName('');
    localStorage.removeItem('currentRoom');
  };

  const loadSavedDocument = (documentId) => {
    const docs = getSavedDocuments();
    const selectedDoc = docs.find((doc) => doc.id === documentId);
    if (!selectedDoc) return;

    setDocTitle(selectedDoc.title || 'Untitled document');
    setPersonalMode(true);
    setCurrentRoom('');
    setActiveUsersList([]);
    setOnlineCount(0);
    setIsSomeoneTyping(false);
    setTyperName('');
    setActiveDocumentId(selectedDoc.id);
    localStorage.setItem(PERSONAL_ACTIVE_KEY, selectedDoc.id);
    localStorage.removeItem('currentRoom');
    hydrateLocalDocument(selectedDoc.content || '');
  };

  const handleDeleteDocument = (documentId) => {
    const documents = getSavedDocuments().filter((doc) => doc.id !== documentId);
    persistSavedDocuments(documents);

    if (documentId === activeDocumentId) {
      setActiveDocumentId('');
      localStorage.removeItem(PERSONAL_ACTIVE_KEY);
      setPersonalMode(false);
      setMessage('');
      setDocTitle('Untitled document');
      resetYDocRef.current();
    }
  };

  const initials = userName
    ? userName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join('')
    : 'U';

  const isEditorActive = Boolean(currentRoom) || personalMode;

  return {
    suggestedRooms,
    message,
    setMessage,
    socket,
    isSomeoneTyping,
    typerName,
    nameInput,
    setNameInput,
    onlineCount,
    userName,
    setUserName,
    roomInput,
    setRoomInput,
    currentRoom,
    setCurrentRoom,
    personalMode,
    setPersonalMode,
    savedDocuments,
    setSavedDocuments,
    activeDocumentId,
    setActiveDocumentId,
    docTitle,
    setDocTitle,
    activeUsersList,
    setActiveUsersList,
    handleSetName,
    handleJoinRoom,
    hydrateLocalDocument,
    persistSavedDocuments,
    saveCurrentPersonalDocument,
    handleCreateNewPersonalDocument,
    handleChange,
    handleLeaveRoom,
    loadSavedDocument,
    handleDeleteDocument,
    initials,
    isEditorActive,
  };
};

export default useWorkspaceState;
