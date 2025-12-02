// Import các module con
import { State } from './game/gameState.js';
import { initSocket } from './game/socketHandler.js';
import { drawBoard } from './game/boardRenderer.js';
import { initStockfish } from './game/stockfishClient.js';
import { setupChat } from './game/chatManager.js';
import { showConfirmModal, showModal, copyToClipboard } from './utils/helpers.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Kiểm tra đăng nhập (Bắt buộc)
    const userJson = localStorage.getItem('user');
    if (!userJson) return window.location.href = 'index.html';
    const user = JSON.parse(userJson);

    // 2. Hiển thị thông tin người chơi & Giao diện ban đầu
    loadGameInfo(user);

    // 3. Kích hoạt Chat & Copy
    setupChat();
    // Gán hàm này vào window để HTML onclick gọi được
    window.copyRoomID = () => copyToClipboard(State.currentRoomId);

    // 4. Khởi tạo Game theo chế độ (Mode)
    const mode = localStorage.getItem('gameMode');
    
    if (mode === 'pve') {
        // --- CHẾ ĐỘ PVE (ĐẤU MÁY) ---
        State.isPvE = true;
        State.myColor = 'w'; // Luôn cầm Trắng
        
        // Cập nhật giao diện
        document.getElementById('room-id-display').innerText = "ĐẤU VỚI MÁY";
        updateOpponentName("Stockfish AI");
        const eloEl = document.getElementById('opponent-elo');
        if(eloEl) eloEl.innerText = "Level: 5";

        // Khởi động AI & Vẽ bàn cờ
        initStockfish();
        drawBoard();

    } else {
        // --- CHẾ ĐỘ PVP (ONLINE) ---
        State.isPvE = false;
        
        // Gọi socketHandler để xử lý kết nối, ghép trận, vào phòng
        initSocket(user); 
        
        // Vẽ bàn cờ trống trước khi nhận dữ liệu
        drawBoard();
    }

    // 5. Gán sự kiện cho các nút chức năng (Đầu hàng, Xin hòa)
    setupActionButtons();
});

// --- CÁC HÀM UI NỘI BỘ ---

function loadGameInfo(user) {
    // 1. Hiển thị thông tin bản thân
    const myNameEl = document.getElementById('my-name');
    if (myNameEl) myNameEl.innerText = user.Username;

    const myAvt = user.AvatarCode || 'WhitePawn';
    const myAvtEl = document.getElementById('my-avatar');
    if (myAvtEl) myAvtEl.src = `assets/images/${myAvt}.png`;

    // 2. Cập nhật trạng thái phòng ban đầu
    const mode = localStorage.getItem('gameMode');
    const roomDisplay = document.getElementById('room-id-display');

    updateOpponentName("Đang tìm đối thủ...");
    const eloEl = document.getElementById('opponent-elo');
    if(eloEl) eloEl.innerText = "ELO: ???";

    if (mode === 'matchmaking') {
        if(roomDisplay) roomDisplay.innerText = "ĐANG TÌM TRẬN...";
        updateOpponentName("Đang quét server...");
    } else if (mode !== 'pve') {
        // Nếu là tạo phòng/nhập ID -> Hiện mã phòng để copy
        if(roomDisplay) {
            roomDisplay.innerHTML = `PHÒNG: <span style="color:#ffeb3b;cursor:pointer" title="Bấm để copy" onclick="copyRoomID()">${State.currentRoomId} 📋</span>`;
        }
    }
}

function updateOpponentName(name) {
    const el = document.getElementById('opponent-name');
    if (el) el.innerText = name;
}

function setupActionButtons() {
    // Nút Đầu Hàng
    const btnResign = document.querySelector('.btn-resign');
    if (btnResign) {
        btnResign.onclick = () => {
            if (State.isPvE) return alert("Đang đấu với máy thì bạn cứ thoát thôi!");
            
            showConfirmModal("Bạn chắc chắn muốn ĐẦU HÀNG?", () => {
                State.socket.emit('resign', State.currentRoomId);
                
                // Tự hiện thông báo thua cho mình luôn
                const modal = document.getElementById('game-over-modal');
                document.getElementById('modal-title').innerText = "THẤT BẠI 🏳️";
                document.getElementById('modal-message').innerText = "Bạn đã đầu hàng.";
                modal.style.display = 'flex';
            });
        };
    }

    // Nút Xin Hòa
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
    
    // Nút Thoát (về Dashboard) đã được xử lý bằng onclick="location.href=..." trong HTML
}