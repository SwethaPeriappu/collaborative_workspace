const EditorPanel = ({
  userName,
  isEditorActive,
  personalMode,
  currentRoom,
  onlineCount,
  activeUsersList,
  isSomeoneTyping,
  typerName,
  message,
  nameInput,
  roomInput,
  suggestedRooms,
  docTitle,
  activeDocumentId,
  handleSetName,
  handleJoinRoom,
  handleLeaveRoom,
  handleDeleteDocument,
  handleChange,
  setNameInput,
  setRoomInput,
  setDocTitle,
}) => {
  if (!userName) {
    return (
      <section className="empty-panel">
        <div className="onboarding-copy">
          <span className="step-badge">Step 1</span>
          <h4>Set your identity</h4>
          <p>Choose a name so your teammates know who is editing in real time.</p>
        </div>

        <form className="inline-form" onSubmit={handleSetName}>
          <input
            type="text"
            className="text-input"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Enter your display name"
          />

          <button type="submit" disabled={!nameInput.trim()}>
            Save name
          </button>
        </form>
      </section>
    );
  }

  if (userName && !isEditorActive) {
    return (
      <section className="empty-panel">
        <div className="onboarding-copy">
          <span className="step-badge">Step 2</span>
          <h4>Choose a space</h4>
          <p>Sync a shared room or open a personal workspace for your own notes.</p>
        </div>

        <form className="inline-form" onSubmit={handleJoinRoom}>
          <input
            type="text"
            className="text-input"
            value={roomInput}
            onChange={(e) => setRoomInput(e.target.value)}
            placeholder="Enter room name"
          />
          <button type="submit" disabled={!roomInput.trim()}>
            Join room
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
    );
  }

  return (
    <div className="editor-shell">
      <div className="roomHeader">
        <div className="room-title-wrap">
          <span className="room-label">{personalMode ? 'Workspace' : 'Room'}</span>
          <h3>{personalMode ? 'Personal space' : currentRoom}</h3>
        </div>
        <div className="editor-actions">
          {personalMode && (
            <button
              type="button"
              className="btn danger-btn"
              onClick={() => handleDeleteDocument(activeDocumentId)}
            >
              Delete
            </button>
          )}
          <button type="button" className="btn" onClick={handleLeaveRoom}>
            {personalMode ? 'Close' : 'Leave room'}
          </button>
        </div>
      </div>

      {!personalMode && (
        <div className="collab-toolbar">
          <div className="presence-pill">
            <span className="presence-dot" />
            {onlineCount} {onlineCount === 1 ? 'person' : 'people'} online
          </div>
          <div className="presence-list">
            {activeUsersList.length > 0 ? activeUsersList.join(' • ') : 'No one else has joined yet'}
          </div>
        </div>
      )}

      <div className="editor-meta">
        <p>
          {personalMode
            ? 'This is your own local document. It is not shared with a room.'
            : 'Updates are shared instantly across the room.'}
        </p>
      </div>

      {personalMode && (
        <div className="document-title-row">
          <input
            type="text"
            className="document-title-input"
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value || 'Untitled document')}
            placeholder="Document name"
          />
        </div>
      )}

      <textarea
        id="msg"
        className="msg-box"
        value={message}
        onChange={handleChange}
        placeholder={personalMode ? 'Write your personal notes here...' : 'Type something here...'}
        spellCheck="false"
      />

      {!personalMode && isSomeoneTyping && (
        <div className="typing-indicator">
          <span className="typing-dot" />
          {typerName} is typing...
        </div>
      )}
    </div>
  );
};

export default EditorPanel;
