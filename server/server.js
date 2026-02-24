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
        // Store the room for this socket
        socketRooms.set(socket.id, { roomId, userId, userName });
        socket.join(roomId);
        console.log(`User ${userName || userId} (${socket.id}) joined room ${roomId}`);

        // Notify others in the room that a new user connected
        socket.to(roomId).emit('user-connected', userId, userName);
    });

    socket.on('offer', (offer, targetRoomId, userName) => {
        const roomInfo = socketRooms.get(socket.id);
        if (roomInfo) {
            // Also store the latest name if it changed
            if (userName) roomInfo.userName = userName;
            console.log(`Offer from ${userName || socket.id} in room ${roomInfo.roomId}`);
            socket.to(roomInfo.roomId).emit('offer', offer, socket.id, userName);
        }
    });

    socket.on('answer', (answer, targetRoomId, userName) => {
        const roomInfo = socketRooms.get(socket.id);
        if (roomInfo) {
            // Also store the latest name if it changed
            if (userName) roomInfo.userName = userName;
            console.log(`Answer from ${userName || socket.id} in room ${roomInfo.roomId}`);
            socket.to(roomInfo.roomId).emit('answer', answer, socket.id, userName);
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

    socket.on('reaction', (emoji) => {
        const roomInfo = socketRooms.get(socket.id);
        if (roomInfo) {
            socket.to(roomInfo.roomId).emit('reaction', emoji, socket.id);
        }
    });

    socket.on('toggle-hand', (isRaised) => {
        const roomInfo = socketRooms.get(socket.id);
        if (roomInfo) {
            socket.to(roomInfo.roomId).emit('toggle-hand', isRaised, socket.id);
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
