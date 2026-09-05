import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

const roomTextData = {}

io.on('connection', (socket) => {
  const { username, sessionId } = socket.handshake.auth;

  socket.username = username || 'Anonymous';
  socket.sessionId = sessionId;
  console.log(`Connection initiated: ${socket.id} with username: ${socket.username}`);

  socket.on('join_room', (room) => {
    if (socket.currentRoom && socket.currentRoom !== room) {
      socket.leave(socket.currentRoom);
      sendUpdatedRoomDetails(socket.currentRoom);
    }

    socket.currentRoom = room;
    socket.join(room);
    console.log(`User ${socket.username} joined room: ${room}`);

    const initialText = roomTextData[room] || '';
    socket.emit('receive_text_update', initialText);
    sendUpdatedRoomDetails(room);
  });

  // let currentState = new Set();
  // currentState.add(socket.id);

  // io.engine.clientsCount gives the count of users connected to the server but it doesn't give the count of users connected to the browser
  // io.emit('user_count', io.engine.clientsCount);
  // so we are using a set to keep track of the users connected to the browser
  // and emitting the count to all the users connected to the server
  // io.emit('user_count', currentState.size);

  socket.on('text_change', (data) => {
    const { room, value } = data;
    roomTextData[room] = value;
    socket.to(room).emit('receive_text_update', value);
    // socket.broadcast.emit('receive_text_update', data);
  });

  socket.on('typing', ({ room, username }) => {
    // socket.broadcast.emit('user_typing', { id: socket.id, isTyping: true });
    socket.to(room).emit('user_typing', { username: username, isTyping: true });
  });

  socket.on('stop_typing', ({ room, username }) => {
    // socket.broadcast.emit('user_typing', { id: socket.id, isTyping: false });
    socket.to(room).emit('user_typing', { username: username, isTyping: false });
  });

  socket.on('disconnect', () => {
    const roomName = socket.currentRoom;
    if (roomName) {
      sendUpdatedRoomDetails(roomName);
    }
    console.log(`Disconnected: ${socket.username}`);
  });
});

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


const port = 3500;
server.listen(port, () => {
  console.log(`Multi-room server running on port ${port}`);
});