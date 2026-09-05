import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import './App.css';

const suggestedRooms = ['General', 'Planning', 'Design Review'];

function App() {
  const [message, setMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const [isSomeoneTyping, setIsSomeoneTyping] = useState(false);
  const [typerName, setTyperName] = useState('');

  const [nameInput, setNameInput] = useState('');
  const [onlineCount, setOnlineCount] = useState(0);

  // Restore the username from localStorage when the app loads
  const [userName, setUserName] = useState(
    () => localStorage.getItem('userName') || ''
  );

  const [roomInput, setRoomInput] = useState('');

  // Restore the last room from localStorage
  const [currentRoom, setCurrentRoom] = useState(
    () => localStorage.getItem('currentRoom') || ''
  );

  const [activeUsersList, setActiveUsersList] = useState([]);

  const isTypingLocally = useRef(false);
  const typingTimeout = useRef(null);

  /*
   * Create a persistent session ID.
   * socket.id is temporary and changes whenever the socket reconnects.
   * sessionId stays the same for this browser session.
   */
  const sessionId = useRef(
    localStorage.getItem('sessionId') || crypto.randomUUID()
  );

  useEffect(() => {
    localStorage.setItem('sessionId', sessionId.current);
  }, []);

  useEffect(() => {
    if (!userName) return;

    const socketInstance = io('http://localhost:3500', {
      transports: ['websocket'],
      auth: {
        username: userName,
        sessionId: sessionId.current,
      },
      // Explicitly enable Socket.IO reconnection
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    setSocket(socketInstance);

    /*
     * This event fires when:
     * 1. The initial connection is established
     * 2. The socket reconnects after a network failure
     *
     * We use it to rejoin the saved room.
     */
    socketInstance.on('connect', () => {
      console.log('Connected:', socketInstance.id);
      const savedRoom = localStorage.getItem('currentRoom');
      if (savedRoom) {
        setCurrentRoom(savedRoom);
        socketInstance.emit('join_room', savedRoom);
      }
    });

    socketInstance.on('receive_text_update', (data) => {
      setMessage(data);
    });

    socketInstance.on('room_users_list', (namesArray) => {
      setActiveUsersList(namesArray);
    });

    socketInstance.on('room_user_count', (count) => {
      setOnlineCount(count);
    });

    socketInstance.on('user_typing', (data) => {
      console.log(`User ${data.username} is typing: ${data.isTyping}`);
      setTyperName(data.username);
      setIsSomeoneTyping(data.isTyping);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('Disconnected:', reason);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    return () => {
      socketInstance.disconnect();
      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
      }
    };
  }, [userName]);

  const handleSetName = (e) => {
    e.preventDefault();
    const trimmedName = nameInput.trim();
    if (!trimmedName) {
      return;
    }
    // Save the username so it survives a browser refresh
    localStorage.setItem('userName', trimmedName);
    setUserName(trimmedName);
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    const trimmedRoom = roomInput.trim();

    if (trimmedRoom !== '' && socket) {
      // Save the room so it survives a browser refresh
      localStorage.setItem('currentRoom', trimmedRoom);
      setCurrentRoom(trimmedRoom);
      socket.emit('join_room', trimmedRoom);
    }
  };

  const handleChange = (e) => {
    const value = e.target.value;
    setMessage(value);

    if (socket && currentRoom) {
      socket.emit('text_change', { room: currentRoom, value });

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

  return (
    <div className="app-container">
      <div className="header">
        <h2>Collaborative Multi Room Editor</h2>
      </div>

      <div className="main-content">
        <div className="side-container">
          <div className="sidebar-section">
            <div className="sidebar-heading">
              <p className="sidebar-label">Profile</p>
              <span className={`status-pill ${userName ? 'active' : 'idle'}`}>
                {userName ? 'Ready' : 'Pending'}
              </span>
            </div>
            <div className="sidebar-card">
              <h4>{userName || 'Add your name'}</h4>
            </div>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-heading">
              <p className="sidebar-label">Room</p>
              <span className={`status-pill ${currentRoom ? 'active' : 'idle'}`}>
                {currentRoom ? 'Joined' : 'Waiting'}
              </span>
            </div>
            <div className="sidebar-card">
              <h4>{currentRoom || 'Join a room'}</h4>
              <p>
                {currentRoom && `${onlineCount} ${onlineCount === 1 ? 'person is' : 'people are'} editing here.`}
              </p>
            </div>
          </div>

          <div className="sidebar-section">
            <p className="sidebar-label">People</p>
            {currentRoom ? (
              <div className="sidebar-card sidebar-card-compact">
                {activeUsersList.length > 0 ? (
                  <ul className="user-list">
                    {activeUsersList.map((name) => (
                      <li key={name}>{name}</li>
                    ))}
                  </ul>
                ) : (
                  <p>
                    Waiting for collaborators to join this room.
                  </p>
                )}
              </div>
            ) : (
              <div className="sidebar-card sidebar-card-compact sidebar-card-muted">
                <p>
                  Collaborators will appear here after you join a room.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="msg-container">
          {!userName && (
            <section className="empty-panel">
              <span className="step-badge">Step 1</span>
              <h4>Enter your user name</h4>

              <form
                className="inline-form"
                onSubmit={handleSetName}
              >
                <input
                  type="text"
                  className="text-input"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Enter your name"
                />

                <button
                  type="submit"
                  disabled={!nameInput.trim()}
                >
                  Set Name
                </button>
              </form>
            </section>
          )}

          {userName && !currentRoom && (
            <section className="empty-panel">
              <span className="step-badge">Step 2</span>
              <h4>Join a room</h4>
              <p>
                Create a room name or reuse an existing one so
                everyone lands in the same shared editor.
              </p>

              <form
                className="inline-form"
                onSubmit={handleJoinRoom}
              >
                <input
                  type="text"
                  className="text-input"
                  value={roomInput}
                  onChange={(e) => setRoomInput(e.target.value)}
                  placeholder="Enter room name"
                />
                <button
                  type="submit"
                  disabled={!roomInput.trim()}
                >
                  Join Room
                </button>
              </form>

              <div className="suggested-rooms">
                {suggestedRooms.map((room) => (
                  <button
                    key={room}
                    type="button"
                    className="room-chip"
                    onClick={() => setRoomInput(room)}
                  >
                    {room}
                  </button>
                ))}
              </div>
            </section>
          )}
          {currentRoom && (
            <>
              <div>
                <strong>Active Users in this room: </strong>
                {activeUsersList.join(', ')}
              </div>
              <p>
                Anyone visiting the room will see this message.
              </p>
              <p>
                👥 {onlineCount}{' '}
                {onlineCount === 1 ? 'User' : 'Users'} online
              </p>

              <textarea
                id="msg"
                className="msg-box"
                value={message}
                onChange={handleChange}
                placeholder="Type something here..."
                spellCheck="false"
              />
              {isSomeoneTyping && (
                <p>{typerName} is typing...</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;