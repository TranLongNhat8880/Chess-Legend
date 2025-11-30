let game = new Chess();
let allMoves = []; // Mảng chứa toàn bộ nước đi
let currentMoveIndex = -1; // -1 nghĩa là chưa đi nước nào (bàn cờ gốc)

// Map tên quân cờ
const pieceTheme = {
    'w': { 'p': 'WhitePawn', 'n': 'WhiteKnight', 'b': 'WhiteBishop', 'r': 'WhiteRook', 'q': 'WhiteQueen', 'k': 'WhiteKing' },
    'b': { 'p': 'BlackPawn', 'n': 'BlackKnight', 'b': 'BlackBishop', 'r': 'BlackRook', 'q': 'BlackQueen', 'k': 'BlackKing' }
};

document.addEventListener('DOMContentLoaded', () => {
    // Lấy ID trận đấu từ URL (ví dụ: replay.html?id=10)
    const urlParams = new URLSearchParams(window.location.search);
    const matchId = urlParams.get('id');

    if (!matchId) {
        alert("Lỗi: Không tìm thấy ID trận đấu!");
        return;
    }

    loadReplayData(matchId);
    drawBoard(); // Vẽ bàn cờ trống ban đầu
});

// 1. Tải dữ liệu từ Server
async function loadReplayData(matchId) {
    try {
        // Gọi API lấy chi tiết trận đấu
        const res = await fetch('http://localhost:5000/api/auth/replay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ matchId: matchId })
        });
        
        const data = await res.json();
        
        if (!data.moves) {
            alert("Không tải được dữ liệu trận đấu!");
            return;
        }

        // Hiển thị tên 2 người chơi
        document.getElementById('white-name').innerText = data.info.white;
        document.getElementById('black-name').innerText = data.info.black;
        
        // Lưu danh sách nước đi
        allMoves = data.moves;
        
        // Vẽ danh sách nước đi bên phải
        renderMoveList();

    } catch (err) {
        console.error(err);
        document.getElementById('move-history').innerHTML = '<p style="color:red; text-align:center;">Lỗi kết nối!</p>';
    }
}

// 2. Các hàm điều khiển (Next/Prev)
function nextMove() {
    if (currentMoveIndex < allMoves.length - 1) {
        currentMoveIndex++;
        const moveData = allMoves[currentMoveIndex];
        
        // Thực hiện nước đi trên logic chess.js
        game.move({
            from: moveData.FromSquare,
            to: moveData.ToSquare,
            promotion: 'q'
        });
        
        drawBoard();
        highlightHistory();
    }
}

function prevMove() {
    if (currentMoveIndex >= 0) {
        game.undo(); // Lùi lại 1 nước
        currentMoveIndex--;
        
        drawBoard();
        highlightHistory();
    }
}

function firstMove() {
    game.reset();
    currentMoveIndex = -1;
    drawBoard();
    highlightHistory();
}

function lastMove() {
    // Đi nhanh đến cuối
    game.reset();
    for (let i = 0; i < allMoves.length; i++) {
        game.move({
            from: allMoves[i].FromSquare,
            to: allMoves[i].ToSquare,
            promotion: 'q'
        });
    }
    currentMoveIndex = allMoves.length - 1;
    drawBoard();
    highlightHistory();
}

// 3. Vẽ bàn cờ (Giống game.js nhưng không có sự kiện Click)
function drawBoard() {
    const boardEl = document.getElementById('chess-board');
    boardEl.innerHTML = '';
    const boardData = game.board();

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            square.classList.add('square');
            
            // Highlight ô vừa đi (nếu có)
            if (currentMoveIndex >= 0) {
                const lastMove = allMoves[currentMoveIndex];
                if (lastMove) {
                    // Logic tính tọa độ từ 'e2' sang row/col hơi phức tạp nên tạm bỏ qua highlight ô
                    // Tập trung highlight danh sách bên phải trước
                }
            }

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

// 4. Vẽ danh sách nước đi (Sidebar)
function renderMoveList() {
    const historyEl = document.getElementById('move-history');
    historyEl.innerHTML = '';
    
    let html = '';
    allMoves.forEach((move, index) => {
        // Tạo chuỗi hiển thị: "e2-e4"
        const moveText = `${move.FromSquare}-${move.ToSquare}`;
        
        // Gom 2 nước (Trắng + Đen) vào 1 dòng
        if (index % 2 === 0) {
            // Nước trắng: Mở div
            html += `<div class="move-row" id="move-row-${Math.floor(index/2)}">`;
            html += `<span class="move-num">${Math.floor(index/2) + 1}.</span>`;
            html += `<span class="move-text" id="move-btn-${index}">${moveText}</span>`;
        } else {
            // Nước đen: Đóng div
            html += `<span class="move-text" id="move-btn-${index}">${moveText}</span>`;
            html += `</div>`;
        }
    });
    // Đóng thẻ div nếu lẻ nước
    if (allMoves.length % 2 !== 0) html += `</div>`;
    
    historyEl.innerHTML = html;
}

// 5. Highlight dòng nước đi đang xem
function highlightHistory() {
    // Xóa highlight cũ
    document.querySelectorAll('.move-text').forEach(el => {
        el.style.backgroundColor = 'transparent';
        el.style.fontWeight = 'normal';
    });

    if (currentMoveIndex >= 0) {
        const el = document.getElementById(`move-btn-${currentMoveIndex}`);
        if (el) {
            el.style.backgroundColor = '#ffeb3b'; // Màu vàng
            el.style.fontWeight = 'bold';
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
}