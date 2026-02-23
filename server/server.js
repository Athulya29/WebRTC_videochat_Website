const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('join-room', (roomId, userId) => {
        socket.join(roomId);
        console.log(`User ${userId} (${socket.id}) joined room ${roomId}`);

        // Notify others in the room
        socket.to(roomId).emit('user-connected', userId);

        socket.on('offer', (offer, toUserId) => {
            socket.to(roomId).emit('offer', offer, socket.id);
        });

        socket.on('answer', (answer, toUserId) => {
            socket.to(roomId).emit('answer', answer, socket.id);
        });

        socket.on('ice-candidate', (candidate, toUserId) => {
            socket.to(roomId).emit('ice-candidate', candidate, socket.id);
        });

        socket.on('chat-message', (message) => {
            socket.to(roomId).emit('chat-message', message, socket.id);
        });

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.id}`);
            socket.to(roomId).emit('user-disconnected', userId);
        });
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Signaling server running on port ${PORT}`);
});
