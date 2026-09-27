# Workspace collaboration

Workspace collaboration is a local-first collaborative workspace built with React, Vite, Socket.IO, and Yjs. It supports both shared room collaboration and private personal note-taking in the same app.

## What it does

- Join a shared room and edit the same document in real time
- See live presence and online collaborator counts
- Receive typing indicators from other users in the room
- Open a personal workspace without creating or joining a room
- Create, save, reopen, and delete personal documents locally in the browser
- Auto-save document content and title as you type
- Keep the private notes list visible in the sidebar for quick access

## Current app structure

- `src/App.jsx` handles the top-level layout and composes the app shell
- `src/components/Sidebar.jsx` renders the left navigation and saved-documents list
- `src/components/EditorPanel.jsx` renders the editor, onboarding, and room views
- `src/hooks/useWorkspaceState.js` contains the shared state and behavior for rooms, Yjs syncing, and personal documents
- `server.js` runs the Socket.IO backend for real-time room synchronization

## Tech stack

- React
- Vite
- Socket.IO
- Yjs
- Express
- Local browser storage for personal document persistence

## Run locally

```bash
npm install
npm run server
npm run dev
```

Then open the app in the browser and either:

1. join a room to collaborate with others, or
2. create a personal document to work privately without entering a room.

## Notes

This project is designed as a lightweight collaborative workspace demo with a personal-document workflow. It is a good starting point for adding authentication, cloud persistence, richer editing tools, room history, or production deployment setup.
