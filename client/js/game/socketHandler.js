import { State } from './gameState.js';
import { drawBoard, addMoveToHistory } from './boardRenderer.js'; 
import { appendChatMessage } from './chatManager.js';
import { playSound, formatTime, showConfirmModal, showGameOverModal } from '../utils/helpers.js';

export function initSocket(user) {
    State.socket = io('http://localhost:5000');
    const socket = State.socket;

    if (localStorage.getItem('gameMode') === 'matchmaking') {
        document.getElementById('room-id-display').innerText = "ĐANG TÌM...";
        socket.emit('find_match', { username: user.Username, elo: user.CurrentElo, avatarCode: user.AvatarCode });
        
        socket.on('match_found', (data) => {
            State.currentRoomId = data.roomId;
            localStorage.setItem('roomID', data.roomId);
            document.getElementById('room-id-display').innerText = "PHÒNG: " + data.roomId;
            socket.emit('join_room', { 
                roomId: data.roomId, 
                username: user.Username, 
                elo: user.CurrentElo, 
                userId: user.UserID,
                avatarCode: user.AvatarCode 
            });
            playSound('notify');
        });
    } else {
        socket.emit('join_room', { 
            roomId: State.currentRoomId, 
            username: user.Username, 
            elo: user.CurrentElo, 
            userId: user.UserID, 
            password: localStorage.getItem('roomPass'),
            avatarCode: user.AvatarCode
        });
    }

    setupSocketListeners();
}

function setupSocketListeners() {
    const socket = State.socket;

    socket.on('init_game', (data) => {
        State.myColor = data.color;
        document.getElementById('my-elo').innerText = `PHE: ${State.myColor === 'w' ? 'TRẮNG' : 'ĐEN'}`;
    });

    socket.on('vs_connect', (data) => {
        document.getElementById('opponent-name').innerText = data.opponentName;
        document.getElementById('opponent-elo').innerText = "ELO: " + data.opponentElo;
        const opAvatar = data.opponentAvatar || 'BlackKing';
        const opImg = document.querySelector('.player-info.opponent .avatar');
        if(opImg) opImg.src = `assets/images/${opAvatar}.png`;
        
        State.isGameActive = true; // Mở khóa bàn cờ
        playSound('notify');
    });

    // --- 👇 ĐOẠN SỬA LỖI LỊCH SỬ 👇 ---
    socket.on('receive_move', (moveData) => {
        // Thực hiện nước đi trên logic client để lấy thông tin đầy đủ (SAN)
        const result = State.game.move(moveData);
        
        if (result) {
            drawBoard(); // Vẽ lại
            
            addMoveToHistory(result); // <--- GHI LỊCH SỬ CỦA ĐỐI THỦ VÀO ĐÂY
            
            playSound(result.flags.includes('c') ? 'capture' : 'move');
        }
    });
    // ----------------------------------

    socket.on('time_update', (data) => {
        document.getElementById('my-timer').innerText = formatTime(State.myColor === 'w' ? data.w : data.b);
        document.getElementById('opponent-timer').innerText = formatTime(State.myColor === 'w' ? data.b : data.w);
    });

    socket.on('receive_chat', (data) => appendChatMessage(data.username, data.message, 'opponent'));
    socket.on('game_over_timeout', (data) => { playSound('notify'); showGameOverModal("HẾT GIỜ! ⏰", `${data.winner} chiến thắng.`); });
    socket.on('opponent_resigned', () => { playSound('notify'); showGameOverModal("CHIẾN THẮNG! 🏆", "Đối thủ đã đầu hàng."); });
    socket.on('opponent_disconnected', () => { State.isGameActive = false; playSound('notify'); showGameOverModal("CHIẾN THẮNG! 🏆", "Đối thủ mất kết nối."); });
    socket.on('game_draw', () => { playSound('notify'); showGameOverModal("HÒA CỜ 🤝", "Hai bên thỏa thuận hòa."); });
    
    socket.on('receive_draw_offer', () => {
        playSound('notify');
        showConfirmModal("Đối thủ muốn xin HÒA. Đồng ý?", () => socket.emit('accept_draw', State.currentRoomId));
    });

    socket.on('join_error', (data) => { alert(data.message); window.location.href = 'dashboard.html'; });
    socket.on('room_full', (data) => { alert(data.message); window.location.href = 'dashboard.html'; });
    
    socket.on('update_user_stats', (data) => {
        const eloEl = document.getElementById('my-elo');
        if(eloEl) eloEl.innerText = `ELO MỚI: ${data.newElo}`;
        const user = JSON.parse(localStorage.getItem('user'));
        if(user) { user.CurrentElo = data.newElo; localStorage.setItem('user', JSON.stringify(user)); }
    });
}