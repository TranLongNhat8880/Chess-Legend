document.addEventListener('DOMContentLoaded', () => {
    loadUserInfo();
    fetchRooms();
    updateRealTimeElo(); 
});

const AVATARS = [
    'WhiteKing', 'WhiteQueen', 'WhiteRook', 'WhiteBishop', 'WhiteKnight', 'WhitePawn',
    'BlackKing', 'BlackQueen', 'BlackRook', 'BlackBishop', 'BlackKnight', 'BlackPawn'
];

function loadUserInfo() {
    const userJson = localStorage.getItem('user');
    if (!userJson) { window.location.href = 'index.html'; return; }
    const user = JSON.parse(userJson);
    
    document.getElementById('dash-name').innerText = user.Username;
    document.getElementById('dash-elo').innerText = user.CurrentElo;
    
    // --- FIX LỖI ẢNH PAWN_WOOD ---
    // Nếu trong DB là 'pawn_wood' (cũ) thì đổi thành 'WhitePawn' (mới)
    let avatar = user.AvatarCode || 'WhitePawn';
    if (avatar === 'pawn_wood') avatar = 'WhitePawn';
    
    const avatarEl = document.getElementById('dash-avatar');
    if(avatarEl) avatarEl.src = `assets/images/${avatar}.png`;
}

function openSettings() {
    const modal = document.getElementById('settings-modal');
    const grid = document.getElementById('avatar-grid');
    const userJson = localStorage.getItem('user');
    const user = JSON.parse(userJson);
    
    let currentAvatar = user.AvatarCode || 'WhitePawn';
    if (currentAvatar === 'pawn_wood') currentAvatar = 'WhitePawn';

    document.getElementById('old-pass').value = '';
    document.getElementById('new-pass').value = '';
    document.getElementById('selected-avatar').value = currentAvatar;

    grid.innerHTML = '';
    AVATARS.forEach(avt => {
        const img = document.createElement('img');
        img.src = `assets/images/${avt}.png`;
        img.title = avt;
        img.style.cssText = "width:100%; cursor:pointer; border:3px solid transparent; border-radius:8px; padding:2px; transition:0.2s;";
        
        if (avt === currentAvatar) {
            img.style.borderColor = '#388e3c';
            img.style.backgroundColor = '#fff';
            img.style.transform = 'scale(1.1)';
        }

        img.onclick = () => {
            Array.from(grid.children).forEach(c => { 
                c.style.borderColor = 'transparent'; 
                c.style.backgroundColor = 'transparent'; 
                c.style.transform = 'none';
            });
            img.style.borderColor = '#388e3c';
            img.style.backgroundColor = '#fff';
            img.style.transform = 'scale(1.1)';
            document.getElementById('selected-avatar').value = avt;
        };
        grid.appendChild(img);
    });

    modal.style.display = 'flex';
}

async function saveSettings() {
    const oldPass = document.getElementById('old-pass').value;
    const newPass = document.getElementById('new-pass').value;
    const avatarCode = document.getElementById('selected-avatar').value;
    const user = JSON.parse(localStorage.getItem('user'));

    if (!oldPass) return alert("Vui lòng nhập Mật khẩu cũ để xác nhận!");

    try {
        const res = await fetch('http://localhost:5000/api/auth/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: user.Username,
                oldPassword: oldPass,
                newPassword: newPass,
                avatarCode: avatarCode
            })
        });

        // Kiểm tra xem phản hồi có phải JSON không
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            throw new Error("Server trả về lỗi không phải JSON (Có thể sai Route)");
        }

        const data = await res.json();

        if (res.ok) {
            alert("✅ " + data.message);
            user.AvatarCode = avatarCode;
            localStorage.setItem('user', JSON.stringify(user));
            loadUserInfo();
            document.getElementById('settings-modal').style.display = 'none';
        } else {
            alert("❌ " + data.message);
        }

    } catch (err) {
        console.error(err);
        alert("Lỗi kết nối Server: " + err.message);
    }
}

// ... (Các hàm khác copy từ phiên bản trước: updateRealTimeElo, fetchRooms, createRoomUI, findMatch, joinRoomById, joinRoom, goToGame, logout, showHistoryModal GIỮ NGUYÊN) ...
async function updateRealTimeElo() {
    const userJson = localStorage.getItem('user');
    if (!userJson) return;
    const user = JSON.parse(userJson);
    try {
        const res = await fetch('http://localhost:5000/api/auth/stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user.Username })
        });
        const data = await res.json();
        if (data.CurrentElo !== undefined) {
            document.getElementById('dash-elo').innerText = data.CurrentElo;
            user.CurrentElo = data.CurrentElo;
            user.TotalWins = data.TotalWins;
            localStorage.setItem('user', JSON.stringify(user));
        }
    } catch (err) { console.error("Lỗi cập nhật ELO:", err); }
}

async function fetchRooms() {
    const listContainer = document.getElementById('room-list');
    listContainer.innerHTML = '<p style="text-align:center; padding-top:20px;">⏳ Đang cập nhật...</p>';
    try {
        const res = await fetch('http://localhost:5000/api/rooms');
        const rooms = await res.json();
        listContainer.innerHTML = ''; 
        if (rooms.length === 0) {
            listContainer.innerHTML = '<p style="text-align:center; color:#795548; margin-top:20px;">Trống</p>';
            return;
        }
        rooms.forEach(room => {
            const div = document.createElement('div');
            div.className = 'room-item';
            const lockIcon = room.isLocked ? '<span class="lock-icon">🔒</span>' : '';
            const statusText = room.isLocked ? 'Riêng tư' : 'Công khai';
            div.innerHTML = `<div><span style="font-weight:bold; font-size: 16px;">${room.id}</span> ${lockIcon}</div><div style="font-size: 12px; color: #555;">${statusText}</div>`;
            div.onclick = () => {
                let password = '';
                if (room.isLocked) {
                    password = prompt(`Phòng "${room.id}" yêu cầu mật khẩu:`);
                    if (password === null) return;
                }
                joinRoom(room.id, password);
            };
            listContainer.appendChild(div);
        });
    } catch (err) { console.error(err); listContainer.innerHTML = '<p style="color:red; text-align:center;">Lỗi kết nối!</p>'; }
}

async function createRoomUI() {
    const roomID = prompt("Đặt tên phòng:", "PhongVip");
    if (!roomID) return;
    const password = prompt("Đặt mật khẩu 5 ký tự (Để trống nếu công khai):");
    if (password && password.length !== 5) { alert("Mật khẩu phải đúng 5 ký tự!"); return; }
    try {
        const res = await fetch('http://localhost:5000/api/rooms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId: roomID, password: password })
        });
        const data = await res.json();
        if (data.success) joinRoom(roomID, password); 
        else alert("Lỗi: " + data.message);
    } catch (err) { alert("Không thể tạo phòng!"); }
}

function findMatch() {
    localStorage.setItem('gameMode', 'matchmaking');
    window.location.href = 'game.html';
}

function joinRoomById() {
    const idInput = document.getElementById('input-room-id');
    const passInput = document.getElementById('input-room-pass');
    const roomId = idInput.value.trim();
    if (!roomId) { alert("Vui lòng nhập Mã Phòng!"); return; }
    joinRoom(roomId, passInput.value.trim());
}

function joinRoom(roomID, password = '') {
    localStorage.setItem('gameMode', 'create_room');
    localStorage.setItem('roomID', roomID);
    localStorage.setItem('roomPass', password);
    window.location.href = 'game.html';
}

function goToGame(mode) {
    localStorage.setItem('gameMode', mode);
    window.location.href = 'game.html';
}

function logout() {
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

async function showHistoryModal() {
    const modal = document.getElementById('history-modal');
    const tbody = document.getElementById('history-list-body');
    const loading = document.getElementById('history-loading');
    
    modal.style.display = 'flex';
    tbody.innerHTML = '';
    loading.style.display = 'block';

    const userJson = localStorage.getItem('user');
    if (!userJson) return;
    const user = JSON.parse(userJson);

    try {
        const res = await fetch('http://localhost:5000/api/auth/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user.Username })
        });

        const matches = await res.json();
        loading.style.display = 'none';

        if (matches.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">Chưa có trận đấu nào.</td></tr>';
            return;
        }

        matches.forEach(m => {
            const tr = document.createElement('tr');
            tr.style.cursor = "pointer";
            tr.title = "Bấm để xem lại ván đấu";
            tr.onclick = () => {
                window.open(`replay.html?id=${m.id}`, '_blank', 'width=1000,height=700');
            };
            tr.onmouseover = () => tr.style.backgroundColor = "#e0e0e0";
            tr.onmouseout = () => tr.style.backgroundColor = "white";

            let color = 'black';
            if(m.result === 'THẮNG') color = '#2e7d32'; 
            if(m.result === 'THUA') color = '#c62828';  
            const date = new Date(m.date).toLocaleString();

            tr.innerHTML = `
                <td style="padding:10px; font-weight:bold; color:${color}; border-bottom:1px solid #ccc;">${m.result}</td>
                <td style="padding:10px; border-bottom:1px solid #ccc;">${m.opponent}</td>
                <td style="padding:10px; border-bottom:1px solid #ccc;">${m.role}</td>
                <td style="padding:10px; border-bottom:1px solid #ccc;">${m.reason}</td>
                <td style="padding:10px; border-bottom:1px solid #ccc; font-size:12px; color:#555;">${date}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error(err);
        loading.innerText = "Lỗi tải lịch sử!";
    }
}