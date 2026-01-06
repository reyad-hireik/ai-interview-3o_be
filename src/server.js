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
const screenSharers = {};
io.on('connection', socket => {
    socket.on('end-meeting', (roomId) => {
        console.log('Meeting ended in room:', roomId);
        socket.to(roomId).emit('meeting-ended');

        delete screenSharers[roomId];
    });

    socket.on('change-role', (roomId, user) => {
        console.log(`User ${user.userId} changed role to ${user.userRole}`);
        io.to(roomId).emit('role-changed', user);
    });

    socket.on('toggle-mic', (roomId, user) => {
        console.log(`User ${user.userId} toggled mic. isMuted: ${user.isMuted}`);
        socket.to(roomId).emit('mic-toggled', user);
    });

    socket.on('toggle-camera', (roomId, user) => {
        console.log(`User ${user.userId} toggled camera. isCameraOff: ${user.isCameraOff}`);
        socket.to(roomId).emit('camera-toggled', user);
    });

    socket.on('screen-share-started', (roomId, data) => {
        console.log(`User ${data.userId} started screen sharing in room ${roomId}`);

        if (screenSharers[roomId] && screenSharers[roomId] !== data.userId) {
            const previousSharerUserId = screenSharers[roomId];
            console.log(`Forcing user ${previousSharerUserId} to stop screen sharing`);
            io.to(roomId).emit('force-stop-screen-share', { odlSharerUserId: previousSharerUserId });
        }

        screenSharers[roomId] = data.userId;
        socket.to(roomId).emit('screen-share-started', data);
    });

    socket.on('screen-share-stopped', (roomId, data) => {
        console.log(`User ${data.userId} stopped screen sharing in room ${roomId}`);
        delete screenSharers[roomId];
        socket.to(roomId).emit('screen-share-stopped', data);
    });

    socket.on('join-room', (roomId, user) => {
        console.log('roomId #', roomId, '\nuserId #', user.userId);
        if (!rooms[roomId]) {
            rooms[roomId] = []
        }
        rooms[roomId].push(user);

        socket.join(roomId);

        socket.emit("all-users", rooms[roomId].filter(u => u.userId !== user.userId));

        if (screenSharers[roomId]) {
            const sharerId = screenSharers[roomId];
            console.log(`Notifying new user ${user.userId} about existing screen share from ${sharerId}`);
            socket.emit('current-screen-share', { odlSharerUserId: sharerId });
            socket.to(roomId).emit('new-user-needs-screen', { odlSharerUserId: sharerId, newUserId: user.userId });
        }

        socket.to(roomId).emit('user-connected', user);

        socket.on('disconnect', () => {
            rooms[roomId] = rooms[roomId].filter(u => u.userId !== user.userId);
            if (screenSharers[roomId] === user.userId) {
                delete screenSharers[roomId];
                socket.to(roomId).emit('screen-share-stopped', { userId: user.userId });
            }
            socket.to(roomId).emit('user-disconnected', user);
        })
    })
})

server.listen(3100, () => console.log("server is running on port 3100"))