const { endMatch } = require('../controllers/matchController');

// KHO DỮ LIỆU RAM
let activeRooms = []; 
let roomPlayers = {}; 
let roomGameStatus = {};
let roomTimeState = {};
let roomTimers = {};
let roomPasswords = {}; 
let matchmakingQueue = []; 
let roomMoveHistory = {}; 

function startRoomTimer(io, roomId) {
    if (roomTimers[roomId]) clearInterval(roomTimers[roomId]);
    roomTimers[roomId] = setInterval(async () => {
        const state = roomTimeState[roomId];
        if (!state) return clearInterval(roomTimers[roomId]);
        if (state.turn === 'w') state.w--; else state.b--;
        io.in(roomId).emit('time_update', { w: state.w, b: state.b });
        if (state.w <= 0 || state.b <= 0) {
            clearInterval(roomTimers[roomId]);
            roomGameStatus[roomId] = false;
            const winnerColor = (state.w <= 0) ? 'b' : 'w';
            const players = roomPlayers[roomId];
            let winnerName = "Đối thủ";
            if (players && players.length === 2) {
                const winnerPlayer = players.find(p => p.color === winnerColor);
                if (winnerPlayer) winnerName = winnerPlayer.username;
                await handleMatchEnd(io, roomId, players, winnerPlayer.dbId, 'Timeout');
            }
            io.in(roomId).emit('game_over_timeout', { winner: winnerName });
        }
    }, 1000);
}

async function handleMatchEnd(io, roomId, players, winnerId, reason) {
    const moves = roomMoveHistory[roomId] || [];
    const p1 = players[0]; 
    const p2 = players[1];
    const result = await endMatch(p1.dbId, p2.dbId, winnerId, reason, moves);
    if (result) {
        io.to(p1.id).emit('update_user_stats', { newElo: result.white.newElo });
        io.to(p2.id).emit('update_user_stats', { newElo: result.black.newElo });
    }
    delete roomMoveHistory[roomId];
}

module.exports = function(io) {
    io.on('connection', (socket) => {
        // MATCHMAKING
        socket.on('find_match', (data) => {
            const exist = matchmakingQueue.find(p => p.id === socket.id);
            if (exist) return;
            matchmakingQueue.push({ 
                id: socket.id, 
                username: data.username, 
                elo: data.elo, 
                avatarCode: data.avatarCode, // <--- Thêm dòng này
                socket: socket 
            });
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

        // JOIN ROOM
        socket.on('join_room', (data) => {
            const { roomId, username, elo, password, userId, avatarCode } = data; // <--- Nhận avatarCode

            if (roomPasswords[roomId] && roomPasswords[roomId] !== password) {
                socket.emit('join_error', { message: "Sai mật khẩu!" }); return;
            }
            if (!roomPlayers[roomId]) roomPlayers[roomId] = [];
            
            if (roomPlayers[roomId].length < 2) {
                const color = roomPlayers[roomId].length === 0 ? 'w' : 'b';
                roomPlayers[roomId].push({ 
                    id: socket.id, username, elo, color, dbId: userId,
                    avatarCode: avatarCode || 'WhitePawn' // <--- Lưu lại
                });
                
                socket.join(roomId);
                socket.emit('join_success', { color });
                socket.emit('init_game', { color });

                if (roomPlayers[roomId].length === 2) {
                    roomGameStatus[roomId] = true;
                    roomMoveHistory[roomId] = []; 
                    roomTimeState[roomId] = { w: 600, b: 600, turn: 'w' };
                    startRoomTimer(io, roomId);

                    const p1 = roomPlayers[roomId][0];
                    const p2 = roomPlayers[roomId][1];
                    
                    io.to(p1.id).emit('vs_connect', { 
                        opponentName: p2.username, 
                        opponentElo: p2.elo,
                        opponentAvatar: p2.avatarCode // <--- Gửi Avt P2 cho P1
                    });
                    io.to(p2.id).emit('vs_connect', { 
                        opponentName: p1.username, 
                        opponentElo: p1.elo,
                        opponentAvatar: p1.avatarCode // <--- Gửi Avt P1 cho P2
                    });
                }
            } else { socket.emit('room_full', { message: "Phòng đầy!" }); }
        });

        socket.on('send_move', (data) => {
            socket.to(data.roomId).emit('receive_move', data.move);
            if(roomTimeState[data.roomId]) roomTimeState[data.roomId].turn = (roomTimeState[data.roomId].turn === 'w') ? 'b' : 'w';
            if (!roomMoveHistory[data.roomId]) roomMoveHistory[data.roomId] = [];
            roomMoveHistory[data.roomId].push({ from: data.move.from, to: data.move.to, color: data.move.color, piece: data.move.piece, fen: data.move.fen || '' });
        });
        socket.on('send_chat', (data) => socket.to(data.roomId).emit('receive_chat', data));
        socket.on('resign', async (roomId) => {
            if (!roomGameStatus[roomId]) return; roomGameStatus[roomId] = false; if(roomTimers[roomId]) clearInterval(roomTimers[roomId]);
            socket.to(roomId).emit('opponent_resigned');
            const players = roomPlayers[roomId];
            if(players && players.length === 2) { const winner = players.find(p => p.id !== socket.id); await handleMatchEnd(io, roomId, players, winner.dbId, 'Resign'); }
        });
        socket.on('offer_draw', (roomId) => socket.to(roomId).emit('receive_draw_offer'));
        socket.on('accept_draw', async (roomId) => {
            if (!roomGameStatus[roomId]) return; roomGameStatus[roomId] = false; if(roomTimers[roomId]) clearInterval(roomTimers[roomId]);
            io.in(roomId).emit('game_draw');
            const players = roomPlayers[roomId]; if(players && players.length === 2) await handleMatchEnd(io, roomId, players, null, 'Draw');
        });
        socket.on('game_over_notify', async (roomId) => {
            if (!roomGameStatus[roomId]) return; roomGameStatus[roomId] = false; if(roomTimers[roomId]) clearInterval(roomTimers[roomId]);
            const players = roomPlayers[roomId];
            if(players && players.length === 2) { const winner = players.find(p => p.id === socket.id); await handleMatchEnd(io, roomId, players, winner.dbId, 'Checkmate'); }
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
                        delete roomPlayers[roomId]; delete roomGameStatus[roomId]; delete roomTimeState[roomId]; delete roomMoveHistory[roomId];
                        if(roomTimers[roomId]) clearInterval(roomTimers[roomId]); if(roomPasswords[roomId]) delete roomPasswords[roomId];
                        const idx = activeRooms.indexOf(roomId); if (idx !== -1) activeRooms.splice(idx, 1);
                    }
                    break;
                }
            }
        });
    });
    return { getActiveRooms: () => activeRooms.map(id => ({ id: id, isLocked: !!roomPasswords[id] })), createRoom: (roomId, password) => { if (activeRooms.includes(roomId)) return false; activeRooms.push(roomId); if (password) roomPasswords[roomId] = password; return true; } };
};