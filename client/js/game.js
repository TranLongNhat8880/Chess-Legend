import { State } from './game/gameState.js';
import { initSocket } from './game/socketHandler.js';
import { drawBoard } from './game/boardRenderer.js';
import { initStockfish } from './game/stockfishClient.js';
import { setupChat } from './game/chatManager.js';
import { showConfirmModal, showModal, copyToClipboard } from './utils/helpers.js';

document.addEventListener('DOMContentLoaded', () => {
    const userJson = localStorage.getItem('user');
    if (!userJson) return window.location.href = 'index.html';
    const user = JSON.parse(userJson);

    // 1. Load thông tin giao diện
    loadGameInfo(user);

    // 2. Setup Chat & Copy
    setupChat();
    window.copyRoomID = () => copyToClipboard(State.currentRoomId);

    // 3. Khởi tạo Game
    const mode = localStorage.getItem('gameMode');
    if (mode === 'pve') {
        State.isPvE = true;
        State.myColor = 'w';
        document.getElementById('room-id-display').innerText = "ĐẤU VỚI MÁY";
        updateOpponentName("Stockfish AI");
        
        initStockfish();
        drawBoard();
    } else {
        State.isPvE = false;
        initSocket(user); 
        drawBoard();
    }

    // 4. Gán sự kiện nút bấm
    const btnResign = document.querySelector('.btn-resign');
    if (btnResign) {
        btnResign.onclick = () => {
            if (State.isPvE) return alert("Đang đấu với máy thì bạn cứ thoát thôi!");
            showConfirmModal("Bạn chắc chắn muốn ĐẦU HÀNG?", () => {
                State.socket.emit('resign', State.currentRoomId);
                const modal = document.getElementById('game-over-modal');
                document.getElementById('modal-title').innerText = "THẤT BẠI 🏳️";
                document.getElementById('modal-message').innerText = "Bạn đã đầu hàng.";
                modal.style.display = 'flex';
            });
        };
    }

    const btnDraw = document.querySelector('.btn-draw');
    if (btnDraw) {
        btnDraw.onclick = () => {
            if (State.isPvE) return alert("Máy không biết hòa đâu! Đánh tiếp đi.");
            showConfirmModal("Gửi lời mời HÒA cho đối thủ?", () => {
                State.socket.emit('offer_draw', State.currentRoomId);
                alert("✅ Đã gửi lời mời. Chờ đối thủ trả lời...");
            });
        };
    }
});

// --- CÁC HÀM UI ---

function loadGameInfo(user) {
    // 1. Set thông tin của mình
    const myNameEl = document.getElementById('my-name');
    if(myNameEl) myNameEl.innerText = user.Username;

    const myAvt = user.AvatarCode || 'WhitePawn';
    const myAvtEl = document.getElementById('my-avatar');
    if(myAvtEl) myAvtEl.src = `assets/images/${myAvt}.png`;

    // 2. Set thông tin đối thủ (Mặc định)
    const opAvtEl = document.querySelector('.player-info.opponent .avatar');
    if (opAvtEl) opAvtEl.src = 'assets/images/BlackKing.png'; // Ảnh mặc định
    // ---------------------------------------------------

    updateOpponentName("Đang tìm đối thủ...");
    const eloEl = document.getElementById('opponent-elo');
    if(eloEl) eloEl.innerText = "ELO: ???";

    // 3. Xử lý hiển thị theo chế độ chơi
    const mode = localStorage.getItem('gameMode');
    const roomDisplay = document.getElementById('room-id-display');
    const currentRoomId = localStorage.getItem('roomID'); // Lấy ID từ localStorage

    if (mode === 'pve') {
        updateOpponentName("Stockfish AI");
        if(roomDisplay) roomDisplay.innerText = "ĐẤU VỚI MÁY";
    } else if (mode === 'matchmaking') {
        if(roomDisplay) roomDisplay.innerText = "ĐANG TÌM TRẬN...";
        updateOpponentName("Đang quét server...");
    } else {
        if(roomDisplay) {
            roomDisplay.innerHTML = `PHÒNG: <span style="color:#ffeb3b;cursor:pointer" title="Bấm để copy" onclick="copyRoomID()">${currentRoomId} 📋</span>`;
        }
    }
}

function updateOpponentName(name) {
    const el = document.getElementById('opponent-name');
    if (el) el.innerText = name;
}