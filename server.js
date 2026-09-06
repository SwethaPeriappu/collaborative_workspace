import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import * as Y from 'yjs';

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Stores one Ydoc for each room
const roomDocuments = new Map();

function getRoomDocument(room) {
  if (!roomDocuments.has(room)) {
    roomDocuments.set(room, new Y.Doc());
  }

  return roomDocuments.get(room);
}

io.on('connection', (socket) => {
  /*
   * Get persistent session information from the client.
   *
   * username -> display name
   * sessionId -> stable browser session identifier
   */
  const {
    username = 'Anonymous',
    sessionId = null
  } = socket.handshake.auth || {};

  socket.username = username;
  socket.sessionId = sessionId;
  console.log(`Connection initiated: ${socket.id} with username: ${socket.username} sessionId: ${socket.sessionId}`);

  /*
   * JOIN ROOM
   */
  socket.on('join_room', (room) => {
    if (!room) {
      return;
    }
    /* If the user is already in another room, remove them from that room first. */
    if (socket.currentRoom && socket.currentRoom !== room) {
      socket.leave(socket.currentRoom);
      sendUpdatedRoomDetails(socket.currentRoom);
    }

    socket.currentRoom = room;
    socket.join(room);
    console.log(`User ${socket.username} joined room: ${room}`);

    /*
     * Send the existing document content to the user who just joined.
     */
    const ydoc = getRoomDocument(room);
    const initialState = Y.encodeStateAsUpdate(ydoc);
    socket.emit('yjs_sync', Array.from(initialState));

    /*
     * Update active users in the room.
     */
    sendUpdatedRoomDetails(room);
  });

  // let currentState = new Set();
  // currentState.add(socket.id);

  // io.engine.clientsCount gives the count of users connected to the server but it doesn't give the count of users connected to the browser
  // io.emit('user_count', io.engine.clientsCount);
  // so we are using a set to keep track of the users connected to the browser
  // and emitting the count to all the users connected to the server
  // io.emit('user_count', currentState.size);

  /*
  * RECEIVE YJS UPDATE
  */
  socket.on('yjs_update', ({room, update}) => {
    if (!room || !update) {
      return;
    }

    const ydoc = getRoomDocument(room);
    const binaryUpdate = new Uint8Array(update);
    Y.applyUpdate(ydoc, binaryUpdate);
    
    /*
     * Forward the update to everybody else in the room.
     * We DON'T send it back to the original sender.
     */
    socket.to(room).emit('yjs_update', Array.from(binaryUpdate));
  });

  /*
   * TEXT CHANGE
   */
  // socket.on('text_change', (data) => {
  //   const { room, value } = data;
  //   if (!room) {
  //     return;
  //   }
  //   /* Store the latest document content. */
  //   roomTextData[room] = value;
  //   /* Send the update to everyone else in the same room. */
  //   socket.to(room).emit('receive_text_update', value);
  // });

  /*
   * USER STARTED TYPING
   */
  socket.on('typing', ({ room, username }) => {
    if (!room) {
      return;
    }
    socket.to(room).emit('user_typing', { username, isTyping: true });
  });

  /*
   * USER STOPPED TYPING
   */
  socket.on('stop_typing', ({ room, username }) => {
    if (!room) {
      return;
    }
    socket.to(room).emit('user_typing', { username, isTyping: false });
  });

   /*
   * LEAVE ROOM
   */
  socket.on('leave_room', (room) => {
    const targetRoom = room || socket.currentRoom;
    if (!targetRoom) {
      return;
    }

    socket.leave(targetRoom);
    if (socket.currentRoom === targetRoom) {
      socket.currentRoom = null;
    }

    console.log(`User ${socket.username} left room: ${targetRoom}`);
    sendUpdatedRoomDetails(targetRoom);
  });


  /*
   * DISCONNECT
   */
  socket.on('disconnect', (reason) => {
    const roomName = socket.currentRoom;
    if (roomName) {
      sendUpdatedRoomDetails(roomName);
    }
    console.log(`Disconnected: ${socket.username} sessionId: ${socket.sessionId} reason: ${reason}`);
  });
});

/*
 * Send the list and count of users
 * currently connected to a room.
 */
function sendUpdatedRoomDetails(room) {
  const activeSockets = io.sockets.adapter.rooms.get(room);
  const currentNames = [];

  if (activeSockets) {
    for (const socketId of activeSockets) {
      const clientSocket = io.sockets.sockets.get(socketId);
      if (clientSocket && clientSocket.username) {
        currentNames.push(clientSocket.username);
      }
    }
  }

  io.to(room).emit('room_users_list', currentNames);
  io.to(room).emit('room_user_count', currentNames.length);
}


const port = Number(process.env.PORT) || 3500;
server.listen(port, () => {
  console.log(`Multi-room server running on port ${port}`);
});