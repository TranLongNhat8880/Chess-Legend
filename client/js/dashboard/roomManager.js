//Xử lý danh sách phòng, tạo phòng, vào phòng
import { RoomService } from '../services/api.js';
import { joinRoom, goToGame } from './navigation.js';

export async function fetchRooms() {
    const list = document.getElementById('room-list');
    list.innerHTML = '<p style="text-align:center; padding-top:20px;">⏳ Đang cập nhật...</p>';

    const res = await RoomService.getList();
    list.innerHTML = '';

    if (!res.ok || res.data.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:#795548; margin-top:20px;">Trống</p>';
        return;
    }

    res.data.forEach(room => {
        const div = document.createElement('div');
        div.className = 'room-item';
        const lockIcon = room.isLocked ? '<span class="lock-icon">🔒</span>' : '';
        const statusText = room.isLocked ? 'Riêng tư' : 'Công khai';

        div.innerHTML = `
            <div><span style="font-weight:bold; font-size: 16px;">${room.id}</span> ${lockIcon}</div>
            <div style="font-size: 12px; color: #555;">${statusText}</div>
        `;
        
        div.onclick = () => {
            let password = '';
            if (room.isLocked) {
                password = prompt(`Phòng "${room.id}" yêu cầu mật khẩu:`);
                if (password === null) return;
            }
            joinRoom(room.id, password);
        };
        list.appendChild(div);
    });
}

export async function createRoomUI() {
    const roomID = prompt("Đặt tên phòng:", "PhongVip");
    if (!roomID) return;

    const password = prompt("Đặt mật khẩu 5 ký tự (Để trống nếu công khai):");
    if (password && password.length !== 5) return alert("Mật khẩu phải đúng 5 ký tự!");

    const res = await RoomService.create(roomID, password);
    
    if (res.ok) {
        goToGame('create_room', roomID, password);
    } else {
        alert("Lỗi: " + res.data.message);
    }
}

export function joinRoomById() {
    const idInput = document.getElementById('input-room-id');
    const passInput = document.getElementById('input-room-pass');
    
    const roomId = idInput.value.trim();
    const password = passInput.value.trim();

    if (!roomId) return alert("Vui lòng nhập Mã Phòng!");
    joinRoom(roomId, password);
}