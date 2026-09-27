import './App.css';
import Sidebar from './components/Sidebar';
import EditorPanel from './components/EditorPanel';
import useWorkspaceState from './hooks/useWorkspaceState';

function App() {
  const {
    suggestedRooms,
    message,
    isSomeoneTyping,
    typerName,
    nameInput,
    onlineCount,
    userName,
    roomInput,
    currentRoom,
    personalMode,
    savedDocuments,
    activeDocumentId,
    docTitle,
    activeUsersList,
    handleSetName,
    handleJoinRoom,
    handleLeaveRoom,
    handleDeleteDocument,
    handleChange,
    setNameInput,
    setRoomInput,
    setDocTitle,
    handleCreateNewPersonalDocument,
    loadSavedDocument,
    initials,
    isEditorActive,
  } = useWorkspaceState();


  return (
    <div className="app-shell">
      <div className="workspace-panel">
        <header className="topbar">
          <div className="brand-block">
            <div className="brand-mark">S</div>
            <div>
              <p className="brand-label">SyncRoom</p>
              <span className="brand-subtitle">Realtime collaboration</span>
            </div>
          </div>
        </header>

        <div className="main-content">
          <Sidebar
            userName={userName}
            initials={initials}
            isEditorActive={isEditorActive}
            currentRoom={currentRoom}
            personalMode={personalMode}
            onlineCount={onlineCount}
            savedDocuments={savedDocuments}
            activeUsersList={activeUsersList}
            loadSavedDocument={loadSavedDocument}
            handleDeleteDocument={handleDeleteDocument}
            handleCreateNewPersonalDocument={handleCreateNewPersonalDocument}
          />

          <main className="msg-container">
            <EditorPanel
              userName={userName}
              isEditorActive={isEditorActive}
              personalMode={personalMode}
              currentRoom={currentRoom}
              onlineCount={onlineCount}
              activeUsersList={activeUsersList}
              isSomeoneTyping={isSomeoneTyping}
              typerName={typerName}
              message={message}
              nameInput={nameInput}
              roomInput={roomInput}
              suggestedRooms={suggestedRooms}
              docTitle={docTitle}
              activeDocumentId={activeDocumentId}
              handleSetName={handleSetName}
              handleJoinRoom={handleJoinRoom}
              handleLeaveRoom={handleLeaveRoom}
              handleDeleteDocument={handleDeleteDocument}
              handleChange={handleChange}
              setNameInput={setNameInput}
              setRoomInput={setRoomInput}
              setDocTitle={setDocTitle}
            />
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;