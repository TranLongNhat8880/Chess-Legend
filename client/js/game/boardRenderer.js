import { State, pieceTheme } from './gameState.js';
import { playSound, showGameOverModal } from '../utils/helpers.js';
import { makeStockfishMove } from './stockfishClient.js';

// --- 1. HÀM VẼ BÀN CỜ (CÓ TỌA ĐỘ SỐ/CHỮ) ---
export function drawBoard() {
    const boardEl = document.getElementById('chess-board');
    if (!boardEl) return;
    
    boardEl.innerHTML = ''; // Xóa bàn cờ cũ
    const boardData = State.game.board();

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            square.className = 'square';
            
            // Tô màu ô
            const isLight = (row + col) % 2 === 0;
            square.classList.add(isLight ? 'light-square' : 'dark-square');

            const squareName = String.fromCharCode(97 + col) + (8 - row);
            square.dataset.square = squareName;

            // --- VẼ TỌA ĐỘ ---
            // Số hàng (1-8) ở cột A
            if (col === 0) {
                const rankLabel = document.createElement('span');
                rankLabel.className = 'coord coord-rank';
                rankLabel.innerText = 8 - row;
                square.appendChild(rankLabel);
            }
            // Chữ cột (a-h) ở hàng 1
            if (row === 7) {
                const fileLabel = document.createElement('span');
                fileLabel.className = 'coord coord-file';
                fileLabel.innerText = String.fromCharCode(97 + col);
                square.appendChild(fileLabel);
            }
            // -----------------

            // Highlight ô đang chọn
            if (State.selectedSquare === squareName) {
                square.classList.add('selected');
            }

            // Vẽ quân cờ
            const piece = boardData[row][col];
            if (piece) {
                const img = document.createElement('img');
                img.src = `assets/images/${pieceTheme[piece.color][piece.type]}.png`;
                img.style.position = 'relative';
                img.style.zIndex = '10'; 
                square.appendChild(img);
            }

            square.onclick = () => handleSquareClick(squareName);
            boardEl.appendChild(square);
        }
    }
    updateGameStatus();
}

// --- 2. HÀM GHI LỊCH SỬ
export function addMoveToHistory(move) {
    const historyEl = document.getElementById('move-history');
    if (!historyEl) return;

    // Logic: Nếu lượt hiện tại là Đen ('b') -> Nghĩa là Trắng vừa đi -> Tạo dòng mới
    if (State.game.turn() === 'b') { 
        const row = document.createElement('div');
        row.className = 'move-row';
        row.style.borderBottom = "1px dashed #ccc";
        row.style.padding = "4px 0";
        
        const moveNum = Math.ceil(State.game.history().length / 2);
        row.innerHTML = `<span style="color:#888; width:20px; display:inline-block">${moveNum}.</span> <b>${move.san}</b>`;
        historyEl.appendChild(row);
    } 
    // Nếu lượt hiện tại là Trắng ('w') -> Nghĩa là Đen vừa đi -> Ghi tiếp vào dòng cũ
    else { 
        const lastRow = historyEl.lastElementChild;
        if (lastRow) {
            lastRow.innerHTML += ` <span style="margin-left:15px">${move.san}</span>`;
        }
    }
    
    // Cuộn xuống dưới cùng
    historyEl.scrollTop = historyEl.scrollHeight;
}

// --- 3. XỬ LÝ CLICK ---
function handleSquareClick(square) {
    // Kiểm tra nếu bàn cờ đang khóa (chưa ghép trận xong)
    if (!State.isGameActive && !State.isPvE) return;

    const game = State.game;
    const piece = game.get(square);
    const isMyPiece = piece && piece.color === State.myColor;

    if (!State.selectedSquare) {
        if (isMyPiece && game.turn() === State.myColor) {
            State.selectedSquare = square;
            drawBoard();
        }
        return;
    }

    if (State.selectedSquare === square) {
        State.selectedSquare = null;
        drawBoard();
        return;
    }

    if (isMyPiece) {
        if (game.turn() === State.myColor) {
            State.selectedSquare = square;
            drawBoard();
        }
        return;
    }

    const move = { from: State.selectedSquare, to: square, promotion: 'q' };

    try {
        const result = game.move(move); // Thử đi

        if (result) {
            State.selectedSquare = null;
            drawBoard();
            
            // GỌI HÀM GHI LỊCH SỬ
            addMoveToHistory(result); 
            
            playSound(result.flags.includes('c') ? 'capture' : 'move');

            // Gửi Socket
            if (!State.isPvE && State.socket) {
                State.socket.emit('send_move', { 
                    roomId: State.currentRoomId, 
                    move: { ...result, fen: game.fen() } 
                });
            }
            
            updateGameStatus();
            if (State.isPvE) makeStockfishMove();

        } else {
            State.selectedSquare = null;
            drawBoard();
        }
    } catch (e) {
        State.selectedSquare = null;
        drawBoard();
    }
}

function updateGameStatus() {
    const game = State.game;
    if (game.in_checkmate()) {
        if (!State.isPvE && State.socket) State.socket.emit('game_over_notify', State.currentRoomId);
        playSound('notify');
        showGameOverModal("CHIẾU HẾT! 👑", "Trận đấu kết thúc.");
    }
}