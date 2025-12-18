const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { connectDB } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Setup Socket Server
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// --- KÍCH HOẠT LOGIC GAME ---
// Import và chạy hàm setup socket, đồng thời lấy về các hàm quản lý phòng
const socketHandler = require('./socket/socketHandler')(io);

// Định nghĩa API Routes cho phòng (Sử dụng dữ liệu từ socketHandler)
app.get('/api/rooms', (req, res) => {
    res.json(socketHandler.getActiveRooms());
});

app.post('/api/rooms', (req, res) => {
    const { roomId, password } = req.body;
    if (!roomId) return res.status(400).json({ message: "Thiếu tên phòng" });
    if (password && password.length !== 5) return res.status(400).json({ message: "Pass phải 5 ký tự" });

    const success = socketHandler.createRoom(roomId, password);
    if (success) res.json({ success: true, roomId });
    else res.status(400).json({ message: "Tên phòng đã tồn tại!" });
});

// Routes Auth
app.use('/api/auth', authRoutes);

// Khởi động Server
server.listen(PORT, async () => {
    console.log(`Server running at http://localhost:${PORT}`);
    await connectDB();
});