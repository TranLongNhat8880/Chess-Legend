import { State } from './gameState.js';
import { drawBoard, addMoveToHistory } from './boardRenderer.js'; 
import { playSound } from '../utils/helpers.js';

let worker = null;

export function initStockfish() {
    try {
        worker = new Worker('js/stockfish.js');
        
        worker.onmessage = (e) => {
            // Nhận nước đi từ máy (Format: "bestmove e2e4 ...")
            if (e.data.startsWith('bestmove')) {
                const moveStr = e.data.split(' ')[1]; // Lấy chuỗi tọa độ 
                
                if (moveStr) {
                    // Thực hiện nước đi trên logic game
                    const move = State.game.move({
                        from: moveStr.substring(0, 2),
                        to: moveStr.substring(2, 4),
                        promotion: 'q' // Mặc định phong Hậu cho máy
                    });
                    
                    if (move) {
                        drawBoard(); // Vẽ lại bàn cờ
                        addMoveToHistory(move);                         
                        document.getElementById('opponent-name').innerText = "Stockfish (Cấp 5)";
                        
                        // Phát âm thanh
                        if (move.flags.includes('c') || move.flags.includes('e')) {
                            playSound('capture');
                        } else {
                            playSound('move');
                        }
                    }
                }
            }
        };
    } catch (e) { 
        console.error("Stockfish error", e); 
        alert("Lỗi khởi tạo Stockfish AI");
    }
}

export function makeStockfishMove() {
    if (State.game.game_over() || !worker) return;
    
    document.getElementById('opponent-name').innerText = "Stockfish (Đang nghĩ...)";
    
    setTimeout(() => {
        if(worker) {
            worker.postMessage("position fen " + State.game.fen());
            worker.postMessage("go depth 5"); 
        }
    }, 500);
}