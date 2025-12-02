import { State, pieceTheme } from './gameState.js';
import { playSound, showGameOverModal } from '../utils/helpers.js'; // Đã import ở đây rồi
import { makeStockfishMove } from './stockfishClient.js';

// --- 1. VẼ BÀN CỜ ---
export function drawBoard() {
    const boardEl = document.getElementById('chess-board');
    if (!boardEl) return;
    
    boardEl.innerHTML = ''; 
    const boardData = State.game.board();

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            square.className = 'square';
            
            const isLight = (row + col) % 2 === 0;
            square.classList.add(isLight ? 'light-square' : 'dark-square');

            const squareName = String.fromCharCode(97 + col) + (8 - row);
            square.dataset.square = squareName;

            // Tọa độ
            if (col === 0) {
                const rankLabel = document.createElement('span');
                rankLabel.className = 'coord coord-rank';
                rankLabel.innerText = 8 - row;
                square.appendChild(rankLabel);
            }
            if (row === 7) {
                const fileLabel = document.createElement('span');
                fileLabel.className = 'coord coord-file';
                fileLabel.innerText = String.fromCharCode(97 + col);
                square.appendChild(fileLabel);
            }

            // Highlight
            if (State.selectedSquare === squareName) {
                square.classList.add('selected');
            }

            // Quân cờ
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

// --- 2. GHI LỊCH SỬ ---
export function addMoveToHistory(move) {
    const historyEl = document.getElementById('move-history');
    if (!historyEl) return;

    if (State.game.turn() === 'b') { 
        const row = document.createElement('div');
        row.className = 'move-row';
        row.style.borderBottom = "1px dashed #ccc";
        row.style.padding = "4px 0";
        
        const moveNum = Math.ceil(State.game.history().length / 2);
        row.innerHTML = `<span style="color:#888; width:20px; display:inline-block">${moveNum}.</span> <b>${move.san}</b>`;
        historyEl.appendChild(row);
    } else { 
        const lastRow = historyEl.lastElementChild;
        if (lastRow) {
            lastRow.innerHTML += ` <span style="margin-left:15px">${move.san}</span>`;
        }
    }
    historyEl.scrollTop = historyEl.scrollHeight;
}

// --- 3. XỬ LÝ CLICK ---
function handleSquareClick(square) {
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
        const result = game.move(move);
        if (result) {
            State.selectedSquare = null;
            drawBoard();
            addMoveToHistory(result);
            
            // Dùng hàm playSound đã import
            playSound(result.flags.includes('c') ? 'capture' : 'move');

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
        if (!State.isPvE && State.socket) {
            State.socket.emit('game_over_notify', State.currentRoomId);
        }
        playSound('notify');
        setTimeout(() => showGameOverModal(statusTitle, statusMessage), 300);
    }
}