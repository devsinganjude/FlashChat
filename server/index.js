const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

// ─── In-Memory Storage ───────────────────────────────────────────
const rooms = new Map();     // code -> { id, name, code, createdAt, expiresAt, maxUsers }
const messages = new Map();  // code -> [{ id, userId, userName, text, timestamp, type }]
const roomUsers = new Map(); // code -> Map<socketId, { id, name, joinedAt }>

// ─── Helpers ─────────────────────────────────────────────────────
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function addSystemMessage(code, text) {
  const msg = {
    id: uuidv4(),
    userId: 'system',
    userName: 'System',
    text,
    timestamp: Date.now(),
    type: 'system',
  };
  if (!messages.has(code)) messages.set(code, []);
  messages.get(code).push(msg);
  return msg;
}

function cleanupRoom(code) {
  const room = rooms.get(code);
  if (!room) return;

  // Notify everyone in the room
  const msg = addSystemMessage(code, '⏰ This room has expired. Thanks for chatting!');
  io.to(code).emit('new-message', msg);
  io.to(code).emit('room-expired');

  // Disconnect all sockets from the room
  const sockets = io.sockets.adapter.rooms.get(code);
  if (sockets) {
    for (const socketId of sockets) {
      const socket = io.sockets.sockets.get(socketId);
      if (socket) socket.leave(code);
    }
  }

  rooms.delete(code);
  messages.delete(code);
  roomUsers.delete(code);
  console.log(`[Cleanup] Room ${code} expired and removed.`);
}

// ─── Expiry Check (every 5 seconds) ─────────────────────────────
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (now >= room.expiresAt) {
      cleanupRoom(code);
    }
  }
}, 5000);

// ─── REST API ────────────────────────────────────────────────────

// Create a room
app.post('/api/rooms', (req, res) => {
  const { name, duration = 15 } = req.body; // duration in minutes
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Room name is required.' });
  }

  const code = generateCode();
  const room = {
    id: uuidv4(),
    name: name.trim(),
    code,
    createdAt: Date.now(),
    expiresAt: Date.now() + duration * 60 * 1000,
    duration,
    maxUsers: 50,
  };

  rooms.set(code, room);
  messages.set(code, []);
  roomUsers.set(code, new Map());

  addSystemMessage(code, `🎉 Room "${room.name}" created! It will expire in ${duration} minute${duration > 1 ? 's' : ''}.`);

  console.log(`[Room] Created: ${code} — "${room.name}" (${duration} min)`);
  res.json({ room });
});

// Get room info
app.get('/api/rooms/:code', (req, res) => {
  const code = req.params.code.toUpperCase();
  const room = rooms.get(code);
  if (!room) return res.status(404).json({ error: 'Room not found or expired.' });

  const users = roomUsers.get(code) || new Map();
  res.json({
    room,
    userCount: users.size,
    users: Array.from(users.values()),
  });
});

// ─── Socket.io ───────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  let currentRoom = null;
  let currentUser = null;

  socket.on('join-room', ({ code, userName }, callback) => {
    const roomCode = code.toUpperCase();
    const room = rooms.get(roomCode);

    if (!room) {
      return callback?.({ error: 'Room not found or expired.' });
    }

    if (Date.now() >= room.expiresAt) {
      cleanupRoom(roomCode);
      return callback?.({ error: 'Room has expired.' });
    }

    const users = roomUsers.get(roomCode);
    if (users.size >= room.maxUsers) {
      return callback?.({ error: 'Room is full.' });
    }

    // Leave previous room if any
    if (currentRoom) {
      socket.leave(currentRoom);
      const prevUsers = roomUsers.get(currentRoom);
      if (prevUsers) {
        prevUsers.delete(socket.id);
        const leaveMsg = addSystemMessage(currentRoom, `👋 ${currentUser?.name || 'Someone'} left the room.`);
        io.to(currentRoom).emit('new-message', leaveMsg);
        io.to(currentRoom).emit('users-update', Array.from(prevUsers.values()));
      }
    }

    currentRoom = roomCode;

    let finalName = userName;
    let counter = 1;
    const existingNames = new Set(Array.from(users.values()).map(u => u.name));
    while (existingNames.has(finalName)) {
      finalName = `${userName} (${counter})`;
      counter++;
    }

    currentUser = { id: socket.id, name: finalName, joinedAt: Date.now() };

    socket.join(roomCode);
    users.set(socket.id, currentUser);

    const joinMsg = addSystemMessage(roomCode, `👋 ${finalName} joined the room!`);
    io.to(roomCode).emit('new-message', joinMsg);
    io.to(roomCode).emit('users-update', Array.from(users.values()));

    const history = messages.get(roomCode) || [];
    callback?.({
      success: true,
      room,
      messages: history,
      users: Array.from(users.values()),
    });
  });

  socket.on('send-message', ({ text, fileData, fileName, fileType }) => {
    if (!currentRoom || !currentUser) return;
    const room = rooms.get(currentRoom);
    if (!room || Date.now() >= room.expiresAt) return;

    if (!text && !fileData) return; // ignore empty

    const msg = {
      id: uuidv4(),
      userId: currentUser.id,
      userName: currentUser.name,
      text: text ? text.trim() : '',
      fileData: fileData || null,
      fileName: fileName || null,
      fileType: fileType || null,
      timestamp: Date.now(),
      type: fileData ? 'file' : 'user',
    };

    if (!messages.has(currentRoom)) messages.set(currentRoom, []);
    messages.get(currentRoom).push(msg);

    io.to(currentRoom).emit('new-message', msg);
  });

  socket.on('typing', ({ isTyping }) => {
    if (!currentRoom || !currentUser) return;
    socket.to(currentRoom).emit('user-typing', {
      userId: currentUser.id,
      userName: currentUser.name,
      isTyping,
    });
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);
    if (currentRoom) {
      const users = roomUsers.get(currentRoom);
      if (users) {
        users.delete(socket.id);
        const leaveMsg = addSystemMessage(currentRoom, `👋 ${currentUser?.name || 'Someone'} left the room.`);
        io.to(currentRoom).emit('new-message', leaveMsg);
        io.to(currentRoom).emit('users-update', Array.from(users.values()));
      }
    }
  });
});

// ─── Start Server ────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Chatroom server running on http://localhost:${PORT}`);
});
