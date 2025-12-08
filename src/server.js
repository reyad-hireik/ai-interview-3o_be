import dotenv from "dotenv";
import express from "express";
import http from "http";
import { Server } from "socket.io";

dotenv.config();
const app = express();

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

const rooms = {};
io.on('connection', socket => {
    socket.on('join-room', (roomId, userId) => {
        console.log('roomId #', roomId, '\nuserId #', userId);
        if (!rooms[roomId]) {
            rooms[roomId] = []
        }
        rooms[roomId].push(userId);

        socket.join(roomId);

        socket.emit("all-users", rooms[roomId].filter(id => id !== userId));

        socket.to(roomId).emit('user-connected', userId);

        socket.on('disconnect', () => {
            rooms[roomId] = rooms[roomId].filter(id => id !== userId)
            socket.to(roomId).emit('user-disconnected', userId);
        })
    })
})

server.listen(3100, () => console.log("server is running on port 3100"))