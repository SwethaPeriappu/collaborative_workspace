const Sidebar = ({
  userName,
  initials,
  isEditorActive,
  currentRoom,
  personalMode,
  onlineCount,
  savedDocuments,
  activeUsersList,
  loadSavedDocument,
  handleDeleteDocument,
  handleCreateNewPersonalDocument,
}) => {
  const roomTitle = personalMode ? 'Personal space' : currentRoom || 'Join a room';
  const statusLabel = personalMode ? 'Local' : currentRoom ? 'Joined' : 'Waiting';

  return (
    <aside className="side-container">
      <div className="sidebar-section">
        <div className="sidebar-heading">
          <p className="sidebar-label">Profile</p>
          <span className={`status-pill ${userName ? 'active' : 'idle'}`}>
            {userName ? 'Ready' : 'Pending'}
          </span>
        </div>

        <div className="sidebar-card profile-card">
          <div className="profile-identity">
            <div className="profile-avatar">{initials}</div>
            <div>
              <h4>{userName || 'Add your name'}</h4>
              <p>{userName ? 'Connected to the shared workspace.' : 'Set your identity for teammates.'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-heading">
          <p className="sidebar-label">Space</p>
          <span className={`status-pill ${isEditorActive ? 'active' : 'idle'}`}>
            {statusLabel}
          </span>
        </div>
        <div className="sidebar-card">
          <h4>{roomTitle}</h4>
          <p>
            {personalMode
              ? 'This document is saved only for your local workspace.'
              : currentRoom
                ? `${onlineCount} ${onlineCount === 1 ? 'person is' : 'people are'} in this room.`
                : 'Choose a shared room or a personal space to start.'}
          </p>
        </div>
      </div>

      <div className="sidebar-section">
        <p className="sidebar-label">{currentRoom ? 'People' : 'Saved documents'}</p>
        {currentRoom ? (
          <div className="sidebar-card sidebar-card-compact">
            {activeUsersList.length > 0 ? (
              <ul className="user-list">
                {activeUsersList.map((name) => (
                  <li key={name}>
                    <span className="user-dot" />
                    {name}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Waiting for collaborators to join this room.</p>
            )}
          </div>
        ) : (
          <div className="saved-documents-panel">
            {savedDocuments.length > 0 ? (
              <div className="saved-documents-list">
                {savedDocuments.map((doc) => (
                  <div key={doc.id} className="saved-doc-item-wrapper">
                    <button
                      type="button"
                      className="saved-doc-item"
                      onClick={() => loadSavedDocument(doc.id)}
                    >
                      <span>{doc.title || 'Untitled document'}</span>
                    </button>
                    <button
                      type="button"
                      className="delete-doc-button"
                      onClick={() => handleDeleteDocument(doc.id)}
                      aria-label={`Delete ${doc.title || 'Untitled document'}`}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="sidebar-card sidebar-card-compact sidebar-card-muted">
                <p>This space is for your private notes and drafts.</p>
              </div>
            )}

            <button
              type="button"
              className="create-doc-button"
              onClick={handleCreateNewPersonalDocument}
            >
              Create personal document
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
