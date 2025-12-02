//Điều hướng chuyển trang or Logout
export function goToGame(mode, roomId = '', pass = '') {
    localStorage.setItem('gameMode', mode);
    if (roomId) {
        localStorage.setItem('roomID', roomId);
        localStorage.setItem('roomPass', pass);
    }
    window.location.href = 'game.html';
}

export function joinRoom(roomID, password = '') {
    localStorage.setItem('gameMode', 'create_room');
    localStorage.setItem('roomID', roomID);
    localStorage.setItem('roomPass', password);
    window.location.href = 'game.html';
}

export function findMatch() {
    localStorage.setItem('gameMode', 'matchmaking');
    window.location.href = 'game.html';
}

export function logout() {
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}