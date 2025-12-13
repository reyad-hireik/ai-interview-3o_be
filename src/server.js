import dotenv from "dotenv";
import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import aiRouter from "./routes/ai.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use("/ai", aiRouter);

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