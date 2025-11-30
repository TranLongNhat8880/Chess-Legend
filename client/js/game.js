let game = null;
let board = null;
let selectedSquare = null;
let socket;
let currentRoomId = localStorage.getItem('roomID');
let myColor = 'w'; 
let isPvE = false;
let stockfish = null; 

// --- KHAI BÁO ÂM THANH (DÙNG FILE LOCAL) ---
// Lưu ý: Bạn cần có file trong thư mục client/assets/sounds/
const soundMove = new Audio('assets/sounds/move.mp3');
const soundCapture = new Audio('assets/sounds/capture.mp3');
const soundNotify = new Audio('assets/sounds/notify.mp3');

// Hàm phát âm thanh an toàn (Chống crash nếu thiếu file)
function playSoundSafe(audioObj) {
    if (!audioObj) return;
    // Clone node để có thể phát chồng âm thanh liên tục
    const soundClone = audioObj.cloneNode(); 
    soundClone.play().catch(error => {
        // Nếu lỗi (do thiếu file hoặc trình duyệt chặn), chỉ log nhẹ cảnh báo
        console.warn("Audio play failed (File missing?):", error.message);
    });
}

const pieceTheme = {
    'w': { 'p': 'WhitePawn', 'n': 'WhiteKnight', 'b': 'WhiteBishop', 'r': 'WhiteRook', 'q': 'WhiteQueen', 'k': 'WhiteKing' },
    'b': { 'p': 'BlackPawn', 'n': 'BlackKnight', 'b': 'BlackBishop', 'r': 'BlackRook', 'q': 'BlackQueen', 'k': 'BlackKing' }
};

document.addEventListener('DOMContentLoaded', () => {
    const userJson = localStorage.getItem('user');
    if (!userJson) return window.location.href = 'index.html';
    const user = JSON.parse(userJson);
    
    loadGameInfo(user);

    game = new Chess();
    const mode = localStorage.getItem('gameMode');

    // --- GÁN SỰ KIỆN NÚT BẤM ---
    const btnResign = document.querySelector('.btn-resign');
    if (btnResign) {
        btnResign.onclick = () => {
            if (isPvE) return alert("Đấu với máy thì cứ thoát ra là thua nhé!");
            showConfirmModal("Bạn chắc chắn muốn ĐẦU HÀNG?", () => {
                socket.emit('resign', currentRoomId);
                showGameOverModal("THẤT BẠI 🏳️", "Bạn đã đầu hàng.");
            });
        };
    }

    const btnDraw = document.querySelector('.btn-draw');
    if (btnDraw) {
        btnDraw.onclick = () => {
            if (isPvE) return alert("Máy không biết hòa đâu! Đánh tiếp đi.");
            showConfirmModal("Gửi lời mời HÒA cho đối thủ?", () => {
                socket.emit('offer_draw', currentRoomId);
                alert("✅ Đã gửi lời mời. Chờ đối thủ trả lời...");
            });
        };
    }

    // --- CẤU HÌNH CHẾ ĐỘ CHƠI ---
    if (mode === 'pve') {
        isPvE = true;
        myColor = 'w';
        try {
            stockfish = new Worker('js/stockfish.js');
            stockfish.onmessage = function(event) {
                if (event.data.startsWith('bestmove')) {
                    const bestMoveStr = event.data.split(' ')[1]; 
                    if(bestMoveStr) {
                         const move = game.move({
                            from: bestMoveStr.substring(0, 2),
                            to: bestMoveStr.substring(2, 4),
                            promotion: 'q'
                        });
                        
                        if(move) {
                            drawBoard();
                            addMoveToHistory(move);
                            updateStatus();
                            updateOpponentName("Stockfish AI (Cấp 5)");
                            
                            // Âm thanh máy đi
                            if (move.flags.includes('c') || move.flags.includes('e')) playSoundSafe(soundCapture);
                            else playSoundSafe(soundMove);
                        }
                    }
                }
            };
        } catch (e) { console.error(e); }
        drawBoard();

    } else if (mode === 'matchmaking') {
        isPvE = false;
        socket = io('http://localhost:5000');
        
        document.getElementById('room-id-display').innerText = "ĐANG TÌM ĐỐI THỦ...";
        updateOpponentName("Đang quét server...");

        socket.emit('find_match', { username: user.Username, elo: user.CurrentElo });

        socket.on('match_found', (data) => {
            currentRoomId = data.roomId;
            localStorage.setItem('roomID', currentRoomId);
            document.getElementById('room-id-display').innerText = "PHÒNG: " + currentRoomId;
            socket.emit('join_room', { roomId: currentRoomId, username: user.Username, elo: user.CurrentElo, userId: user.UserID });
            playSoundSafe(soundNotify); // Báo hiệu tìm thấy trận
        });

        setupSocketEvents();
        drawBoard();

    } else {
        isPvE = false;
        socket = io('http://localhost:5000'); 
        const password = localStorage.getItem('roomPass') || '';

        socket.emit('join_room', { 
            roomId: currentRoomId, username: user.Username, elo: user.CurrentElo, userId: user.UserID, password: password 
        });
        
        socket.on('join_error', (data) => { alert(data.message); window.location.href = 'dashboard.html'; });
        socket.on('room_full', (data) => { alert(data.message); window.location.href = 'dashboard.html'; });

        setupSocketEvents();
        drawBoard();
    }
});

function setupSocketEvents() {
    socket.on('init_game', (data) => {
        myColor = data.color;
        const text = (myColor === 'w') ? "TRẮNG (Đi trước)" : "ĐEN (Đi sau)";
        const eloEl = document.getElementById('my-elo');
        if(eloEl) eloEl.innerText = `PHE: ${text}`;
    });

    socket.on('vs_connect', (data) => {
        updateOpponentName(data.opponentName);
        const eloEl = document.getElementById('opponent-elo');
        if(eloEl) eloEl.innerText = "ELO: " + data.opponentElo;
        playSoundSafe(soundNotify); // Báo hiệu đối thủ vào
    });

    socket.on('receive_move', (move) => {
        const result = game.move(move);
        drawBoard();
        addMoveToHistory(move);
        updateStatus();
        
        // Âm thanh khi đối thủ đi
        if (result && (result.flags.includes('c') || result.flags.includes('e'))) {
            playSoundSafe(soundCapture);
        } else {
            playSoundSafe(soundMove);
        }
    });

    socket.on('receive_chat', (data) => appendChatMessage(data.username, data.message, 'opponent'));

    socket.on('time_update', (data) => {
        const myTimer = document.getElementById('my-timer');
        const opTimer = document.getElementById('opponent-timer');
        if (!myTimer || !opTimer) return;

        if (myColor === 'w') {
            myTimer.innerText = formatTime(data.w);
            opTimer.innerText = formatTime(data.b);
            myTimer.style.color = (data.w < 30) ? '#d32f2f' : '#fff';
        } else {
            myTimer.innerText = formatTime(data.b);
            opTimer.innerText = formatTime(data.w);
            myTimer.style.color = (data.b < 30) ? '#d32f2f' : '#fff';
        }
    });

    socket.on('game_over_timeout', (data) => {
        playSoundSafe(soundNotify);
        showGameOverModal("HẾT GIỜ! ⏰", `${data.winner} chiến thắng.`);
    });

    socket.on('opponent_resigned', () => {
        playSoundSafe(soundNotify);
        showGameOverModal("CHIẾN THẮNG! 🏆", "Đối thủ đã đầu hàng.");
    });
    
    socket.on('opponent_disconnected', () => {
        playSoundSafe(soundNotify);
        showGameOverModal("CHIẾN THẮNG! 🏆", "Đối thủ mất kết nối.");
    });
    
    socket.on('receive_draw_offer', () => {
        playSoundSafe(soundNotify);
        showConfirmModal("Đối thủ muốn xin HÒA. Bạn đồng ý không?", () => {
            socket.emit('accept_draw', currentRoomId);
        });
    });

    socket.on('game_draw', () => {
        playSoundSafe(soundNotify);
        showGameOverModal("HÒA CỜ 🤝", "Hai bên thỏa thuận hòa.");
    });

    socket.on('update_user_stats', (data) => {
        const eloEl = document.getElementById('my-elo');
        if (eloEl) {
            const currentText = eloEl.innerText.split('|')[0] || "PHE: ???"; 
            eloEl.innerText = `${currentText} | ELO MỚI: ${data.newElo}`;
            eloEl.style.color = "#ffeb3b";
        }
        const userJson = localStorage.getItem('user');
        if (userJson) {
            const user = JSON.parse(userJson);
            user.CurrentElo = data.newElo;
            localStorage.setItem('user', JSON.stringify(user));
        }
    });
}

// ... (Các hàm loadGameInfo, updateOpponentName, formatTime, showConfirmModal, showGameOverModal GIỮ NGUYÊN) ...
function loadGameInfo(user) {
    const myNameEl = document.getElementById('my-name');
    if(myNameEl) myNameEl.innerText = user.Username;
    const myAvt = user.AvatarCode || 'WhiteKing';
    const myAvtEl = document.getElementById('my-avatar');
    if(myAvtEl) myAvtEl.src = `assets/images/${myAvt}.png`;

    const mode = localStorage.getItem('gameMode');
    const roomDisplay = document.getElementById('room-id-display');
    
    if (mode === 'pve') {
        updateOpponentName("Stockfish AI");
        if(roomDisplay) roomDisplay.innerText = "ĐẤU VỚI MÁY";
    } else if (mode === 'matchmaking') {
        if(roomDisplay) roomDisplay.innerText = "TÌM TRẬN...";
    } else {
        if(roomDisplay) roomDisplay.innerHTML = `PHÒNG: <span style="color:#ffeb3b;cursor:pointer" onclick="copyRoomID()">${currentRoomId} 📋</span>`;
        updateOpponentName("Đang tìm đối thủ...");
        const eloEl = document.getElementById('opponent-elo');
        if(eloEl) eloEl.innerText = "ELO: ???";
    }
}

function updateOpponentName(name) {
    const el = document.getElementById('opponent-name');
    if (el) el.innerText = name;
}

function formatTime(seconds) {
    if (seconds < 0) return "00:00";
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

function showConfirmModal(message, onYesCallback) {
    const modal = document.getElementById('confirm-modal');
    if (!modal) return;
    document.getElementById('confirm-message').innerText = message;
    const btnYes = document.getElementById('btn-confirm-yes');
    if(btnYes) {
        btnYes.onclick = function() {
            onYesCallback();
            modal.style.display = 'none';
        };
    }
    modal.style.display = 'flex';
}

function showGameOverModal(title, message) {
    const modal = document.getElementById('game-over-modal');
    if (!modal) return;
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-message').innerText = message;
    modal.style.display = 'flex';
}

function copyRoomID() {
    if (!currentRoomId) return;
    navigator.clipboard.writeText(currentRoomId).then(() => alert("Đã copy: " + currentRoomId));
}

function drawBoard() {
    const boardEl = document.getElementById('chess-board');
    if (!boardEl) return;
    boardEl.innerHTML = '';
    const boardData = game.board();

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            square.classList.add('square');
            const squareName = String.fromCharCode(97 + col) + (8 - row);
            square.dataset.square = squareName;
            square.addEventListener('click', () => onSquareClick(squareName));
            if (selectedSquare === squareName) square.classList.add('selected');
            const piece = boardData[row][col];
            if (piece) {
                const img = document.createElement('img');
                const fileName = pieceTheme[piece.color][piece.type] + ".png";
                img.src = `assets/images/${fileName}`;
                square.appendChild(img);
            }
            boardEl.appendChild(square);
        }
    }
}

function onSquareClick(square) {
    const clickedPiece = game.get(square);
    const isMyPiece = clickedPiece && clickedPiece.color === myColor;

    if (!selectedSquare) {
        if (isMyPiece && game.turn() === myColor) {
            selectedSquare = square;
            drawBoard();
        }
        return;
    }

    if (selectedSquare === square) { selectedSquare = null; drawBoard(); return; }
    if (isMyPiece) { if (game.turn() === myColor) { selectedSquare = square; drawBoard(); } return; }

    const move = { from: selectedSquare, to: square, promotion: 'q' };

    try {
        const result = game.move(move);
        if (result) {
            selectedSquare = null;
            drawBoard();
            addMoveToHistory(result);

            // Âm thanh khi mình đi
            if (result.flags.includes('c') || result.flags.includes('e')) playSoundSafe(soundCapture);
            else playSoundSafe(soundMove);

            if (!isPvE && socket) {
                socket.emit('send_move', { roomId: currentRoomId, move: { ...result, fen: game.fen() } });
            }
            updateStatus();
            if (isPvE) makeStockfishMove();
        } else {
            selectedSquare = null;
            drawBoard();
        }
    } catch (e) { selectedSquare = null; drawBoard(); }
}

function makeStockfishMove() {
    if (game.game_over()) return;
    updateOpponentName("Stockfish AI (Đang nghĩ...)");
    setTimeout(() => {
        if(stockfish) {
            stockfish.postMessage("position fen " + game.fen());
            stockfish.postMessage("go depth 5"); 
        }
    }, 500);
}

function updateStatus() {
    let statusTitle = '', statusMessage = '', isGameOver = false;
    const loser = (game.turn() === 'w') ? 'Trắng' : 'Đen';
    const winner = (game.turn() === 'w') ? 'Đen' : 'Trắng';

    if (game.in_checkmate()) {
        statusTitle = "CHIẾU HẾT! 👑";
        statusMessage = `Bên ${loser} hết đường. ${winner} thắng!`;
        isGameOver = true;
    } else if (game.in_draw()) {
        statusTitle = "HÒA CỜ! 🤝";
        statusMessage = "Ván đấu kết thúc hòa.";
        isGameOver = true;
    }

    if (isGameOver) {
        playSoundSafe(soundNotify); // Âm thanh kết thúc
        if (!isPvE && socket) socket.emit('game_over_notify', currentRoomId);
        setTimeout(() => showGameOverModal(statusTitle, statusMessage), 300);
    }
}

function addMoveToHistory(move) {
    const historyEl = document.getElementById('move-history');
    if (!historyEl) return;
    if (game.turn() === 'b') { 
        const row = document.createElement('div');
        row.style.borderBottom = "1px dashed #ccc";
        row.innerHTML = `<b>${Math.ceil(game.history().length / 2)}.</b> ${move.san}`;
        historyEl.appendChild(row);
    } else { 
        const lastRow = historyEl.lastElementChild;
        if (lastRow) lastRow.innerHTML += ` &nbsp;&nbsp; ${move.san}`;
    }
    historyEl.scrollTop = historyEl.scrollHeight;
}

function sendChat() {
    const input = document.getElementById('chat-input');
    if(!input) return;
    const message = input.value.trim();
    if (!message) return;
    const myNameEl = document.getElementById('my-name');
    const myName = myNameEl ? myNameEl.innerText : "Tôi";
    appendChatMessage("Tôi", message, 'me');
    if (!isPvE && socket) {
        socket.emit('send_chat', { roomId: currentRoomId, username: myName, message: message });
    }
    input.value = '';
}

function handleChatKey(event) { if (event.key === 'Enter') sendChat(); }

function appendChatMessage(sender, text, type) {
    const chatBox = document.getElementById('chat-box');
    if(!chatBox) return;
    const div = document.createElement('div');
    div.className = `chat-message ${type}`;
    div.innerText = `${sender}: ${text}`;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}