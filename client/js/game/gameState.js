//Nơi lưu trữ các biến dùng chung để các file khác truy cập
// Lưu trạng thái game để các module khác dùng chung
export const State = {
    game: new Chess(),
    socket: null,
    currentRoomId: localStorage.getItem('roomID'),
    myColor: 'w',
    isPvE: false,
    selectedSquare: null,
    isGameActive: false
};

export const pieceTheme = {
    'w': { 'p': 'WhitePawn', 'n': 'WhiteKnight', 'b': 'WhiteBishop', 'r': 'WhiteRook', 'q': 'WhiteQueen', 'k': 'WhiteKing' },
    'b': { 'p': 'BlackPawn', 'n': 'BlackKnight', 'b': 'BlackBishop', 'r': 'BlackRook', 'q': 'BlackQueen', 'k': 'BlackKing' }
};
