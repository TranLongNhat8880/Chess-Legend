const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { connectDB } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const { endMatch } = require('./controllers/matchController'); // Import hàm lưu DB
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// KHO DỮ LIỆU RAM
let activeRooms = []; 
let roomPlayers = {}; 
let roomGameStatus = {};
let roomTimeState = {};
let roomTimers = {};
let roomPasswords = {}; 
let matchmakingQueue = []; 
let roomMoveHistory = {}; 

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);

// API
app.get('/api/rooms', (req, res) => {
    const publicRooms = activeRooms.map(id => ({ id: id, isLocked: !!roomPasswords[id] }));
    res.json(publicRooms);
});

app.post('/api/rooms', (req, res) => {
    const { roomId, password } = req.body;
    if (!roomId) return res.status(400).json({ message: "Thiếu tên phòng" });
    if (password && password.length !== 5) return res.status(400).json({ message: "Pass phải 5 ký tự" });

    if (!activeRooms.includes(roomId)) {
        activeRooms.push(roomId);
        if (password) roomPasswords[roomId] = password;
    }
    res.json({ success: true, roomId });
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// --- HÀM XỬ LÝ KẾT THÚC GAME & GỬI ELO VỀ CLIENT ---
async function handleMatchEnd(roomId, players, winnerId, reason) {
    // 1. Lấy lịch sử nước đi
    const moves = roomMoveHistory[roomId] || [];
    const p1 = players[0]; // Trắng
    const p2 = players[1]; // Đen

    // 2. Gọi hàm tính điểm và Lưu DB
    // winnerId truyền vào là userId trong DB (dbId)
    const result = await endMatch(p1.dbId, p2.dbId, winnerId, reason, moves);

    // 3. Gửi ELO mới về cho Client cập nhật ngay lập tức
    if (result) {
        // Gửi cho người cầm Trắng
        io.to(p1.id).emit('update_user_stats', { newElo: result.white.newElo });
        
        // Gửi cho người cầm Đen
        io.to(p2.id).emit('update_user_stats', { newElo: result.black.newElo });
        
        console.log(`📡 Đã gửi cập nhật ELO: W->${result.white.newElo}, B->${result.black.newElo}`);
    }

    // 4. Dọn dẹp RAM
    delete roomMoveHistory[roomId];
}

// --- TIMER FUNCTION ---
function startRoomTimer(roomId) {
    if (roomTimers[roomId]) clearInterval(roomTimers[roomId]);
    roomTimers[roomId] = setInterval(async () => {
        const state = roomTimeState[roomId];
        if (!state) return clearInterval(roomTimers[roomId]);

        if (state.turn === 'w') state.w--; else state.b--;
        io.in(roomId).emit('time_update', { w: state.w, b: state.b });

        // HẾT GIỜ
        if (state.w <= 0 || state.b <= 0) {
            clearInterval(roomTimers[roomId]);
            roomGameStatus[roomId] = false;

            const winnerColor = (state.w <= 0) ? 'b' : 'w';
            const players = roomPlayers[roomId];
            let winnerName = "Đối thủ";
            
            if (players && players.length === 2) {
                const winnerPlayer = players.find(p => p.color === winnerColor);
                if (winnerPlayer) winnerName = winnerPlayer.username;

                // GỌI HÀM CHUNG ĐỂ LƯU VÀ GỬI ELO
                await handleMatchEnd(roomId, players, winnerPlayer.dbId, 'Timeout');
            }

            io.in(roomId).emit('game_over_timeout', { winner: winnerName });
        }
    }, 1000);
}

io.on('connection', (socket) => {
    console.log(`⚡ User connected: ${socket.id}`);
    
    // --- MATCHMAKING ---
    socket.on('find_match', (data) => {
        const exist = matchmakingQueue.find(p => p.id === socket.id);
        if (exist) return;
        matchmakingQueue.push({ id: socket.id, username: data.username, elo: data.elo, socket: socket });

        if (matchmakingQueue.length >= 2) {
            const p1 = matchmakingQueue.shift();
            const p2 = matchmakingQueue.shift();
            const matchRoomId = `match_${Date.now()}_${Math.floor(Math.random()*100)}`;
            activeRooms.push(matchRoomId);
            p1.socket.emit('match_found', { roomId: matchRoomId });
            p2.socket.emit('match_found', { roomId: matchRoomId });
        }
    });

    socket.on('cancel_find_match', () => {
        const idx = matchmakingQueue.findIndex(p => p.id === socket.id);
        if (idx !== -1) matchmakingQueue.splice(idx, 1);
    });

    // --- JOIN ROOM ---
    socket.on('join_room', (data) => {
        const { roomId, username, elo, password, userId } = data; 

        if (roomPasswords[roomId] && roomPasswords[roomId] !== password) {
            socket.emit('join_error', { message: "❌ Sai mật khẩu!" });
            return;
        }

        if (!roomPlayers[roomId]) roomPlayers[roomId] = [];
        if (roomPlayers[roomId].length < 2) {
            const color = roomPlayers[roomId].length === 0 ? 'w' : 'b';
            roomPlayers[roomId].push({ id: socket.id, username, elo, color, dbId: userId });
            
            socket.join(roomId);
            socket.emit('join_success', { color });
            socket.emit('init_game', { color });

            if (roomPlayers[roomId].length === 2) {
                roomGameStatus[roomId] = true;
                roomMoveHistory[roomId] = []; 
                roomTimeState[roomId] = { w: 600, b: 600, turn: 'w' };
                startRoomTimer(roomId);

                const p1 = roomPlayers[roomId][0];
                const p2 = roomPlayers[roomId][1];
                io.to(p1.id).emit('vs_connect', { opponentName: p2.username, opponentElo: p2.elo });
                io.to(p2.id).emit('vs_connect', { opponentName: p1.username, opponentElo: p1.elo });
            }
        } else {
            socket.emit('room_full', { message: "Phòng đầy!" });
        }
    });

    socket.on('send_move', (data) => {
        socket.to(data.roomId).emit('receive_move', data.move);
        if(roomTimeState[data.roomId]) {
             roomTimeState[data.roomId].turn = (roomTimeState[data.roomId].turn === 'w') ? 'b' : 'w';
        }
        if (!roomMoveHistory[data.roomId]) roomMoveHistory[data.roomId] = [];
        roomMoveHistory[data.roomId].push({
            from: data.move.from, to: data.move.to, color: data.move.color, piece: data.move.piece, fen: data.move.fen || ''
        });
    });

    socket.on('send_chat', (data) => socket.to(data.roomId).emit('receive_chat', data));

    // --- KẾT THÚC GAME (Sử dụng handleMatchEnd) ---

    // 1. Đầu hàng
    socket.on('resign', async (roomId) => {
        if (!roomGameStatus[roomId]) return;
        roomGameStatus[roomId] = false;
        if(roomTimers[roomId]) clearInterval(roomTimers[roomId]);
        socket.to(roomId).emit('opponent_resigned');

        const players = roomPlayers[roomId];
        if(players && players.length === 2) {
            const winner = players.find(p => p.id !== socket.id);
            // Gọi hàm xử lý chung
            await handleMatchEnd(roomId, players, winner.dbId, 'Resign');
        }
    });

    // 2. Hòa
    socket.on('offer_draw', (roomId) => socket.to(roomId).emit('receive_draw_offer'));
    socket.on('accept_draw', async (roomId) => {
        if (!roomGameStatus[roomId]) return;
        roomGameStatus[roomId] = false;
        if(roomTimers[roomId]) clearInterval(roomTimers[roomId]);
        io.in(roomId).emit('game_draw');

        const players = roomPlayers[roomId];
        if(players && players.length === 2) {
            // Hòa thì winnerId = null
            await handleMatchEnd(roomId, players, null, 'Draw');
        }
    });

    // 3. Chiếu hết
    socket.on('game_over_notify', async (roomId) => {
        if (!roomGameStatus[roomId]) return;
        roomGameStatus[roomId] = false;
        if(roomTimers[roomId]) clearInterval(roomTimers[roomId]);

        const players = roomPlayers[roomId];
        if(players && players.length === 2) {
            const winner = players.find(p => p.id === socket.id);
            await handleMatchEnd(roomId, players, winner.dbId, 'Checkmate');
        }
    });

    socket.on('disconnect', () => {
        const idxQueue = matchmakingQueue.findIndex(p => p.id === socket.id);
        if (idxQueue !== -1) matchmakingQueue.splice(idxQueue, 1);

        for (const roomId in roomPlayers) {
            const players = roomPlayers[roomId];
            const index = players.findIndex(p => p.id === socket.id);
            if (index !== -1) {
                players.splice(index, 1);
                
                if (players.length > 0 && roomGameStatus[roomId]) {
                    io.to(players[0].id).emit('opponent_disconnected');
                    roomGameStatus[roomId] = false;
                    if(roomTimers[roomId]) clearInterval(roomTimers[roomId]);
                }
                
                if (players.length === 0) {
                    delete roomPlayers[roomId];
                    delete roomGameStatus[roomId];
                    delete roomTimeState[roomId];
                    delete roomMoveHistory[roomId];
                    if(roomTimers[roomId]) clearInterval(roomTimers[roomId]);
                    if(roomPasswords[roomId]) delete roomPasswords[roomId];
                    const idx = activeRooms.indexOf(roomId);
                    if (idx !== -1) activeRooms.splice(idx, 1);
                }
                break;
            }
        }
    });
});

server.listen(PORT, async () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    await connectDB();
});