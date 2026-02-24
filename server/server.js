const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        // Allow connections from the Vercel deployed app, or any origin if not set
        origin: process.env.CLIENT_URL || "*",
        methods: ["GET", "POST"]
    }
});

// Track which room each socket is in
const socketRooms = new Map();

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('join-room', (roomId, userId, userName) => {
        // Store the room and name for this socket
        socketRooms.set(socket.id, { roomId, userId, userName: userName || 'Guest' });
        socket.join(roomId);
        console.log(`User ${userName || userId} (${socket.id}) joined room ${roomId}`);

        // Send existing users' names to the newly joined user
        const existingUsers = [];
        for (const [sid, info] of socketRooms.entries()) {
            if (info.roomId === roomId && sid !== socket.id) {
                existingUsers.push({ userId: info.userId, userName: info.userName });
            }
        }
        if (existingUsers.length > 0) {
            socket.emit('room-users', existingUsers);
        }

        // Notify others in the room that a new user connected (with their name)
        socket.to(roomId).emit('user-connected', userId, userName || 'Guest');
    });

    socket.on('offer', (offer, targetRoomId) => {
        const roomInfo = socketRooms.get(socket.id);
        if (roomInfo) {
            console.log(`Offer from ${socket.id} in room ${roomInfo.roomId}`);
            socket.to(roomInfo.roomId).emit('offer', offer, socket.id);
        }
    });

    socket.on('answer', (answer, targetRoomId) => {
        const roomInfo = socketRooms.get(socket.id);
        if (roomInfo) {
            console.log(`Answer from ${socket.id} in room ${roomInfo.roomId}`);
            socket.to(roomInfo.roomId).emit('answer', answer, socket.id);
        }
    });

    socket.on('ice-candidate', (candidate, targetRoomId) => {
        const roomInfo = socketRooms.get(socket.id);
        if (roomInfo) {
            socket.to(roomInfo.roomId).emit('ice-candidate', candidate, socket.id);
        }
    });

    socket.on('chat-message', (message) => {
        const roomInfo = socketRooms.get(socket.id);
        if (roomInfo) {
            socket.to(roomInfo.roomId).emit('chat-message', message, socket.id);
        }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        const roomInfo = socketRooms.get(socket.id);
        if (roomInfo) {
            socket.to(roomInfo.roomId).emit('user-disconnected', roomInfo.userId);
            socketRooms.delete(socket.id);
        }
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Signaling server running on port ${PORT}`);
});
