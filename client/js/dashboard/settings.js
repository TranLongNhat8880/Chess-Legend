//Xử lý Modal Cài đặt (Avatar, Pass)
import { AuthService } from '../services/api.js';
import { showModal, hideModal } from '../utils/helpers.js';
import { loadUserInfo } from './userInfo.js'; // Để load lại ảnh sau khi đổi

const AVATARS = [
    'WhiteKing', 'WhiteQueen', 'WhiteRook', 'WhiteBishop', 'WhiteKnight', 'WhitePawn',
    'BlackKing', 'BlackQueen', 'BlackRook', 'BlackBishop', 'BlackKnight', 'BlackPawn'
];

export function openSettings() {
    const user = JSON.parse(localStorage.getItem('user'));
    let currentAvatar = user.AvatarCode || 'WhitePawn';
    if (currentAvatar === 'pawn_wood') currentAvatar = 'WhitePawn';

    document.getElementById('old-pass').value = '';
    document.getElementById('new-pass').value = '';
    document.getElementById('selected-avatar').value = currentAvatar;

    const grid = document.getElementById('avatar-grid');
    grid.innerHTML = '';
    
    AVATARS.forEach(avt => {
        const img = document.createElement('img');
        img.src = `assets/images/${avt}.png`;
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

    showModal('settings-modal');
}

export async function saveSettings() {
    const oldPass = document.getElementById('old-pass').value;
    const newPass = document.getElementById('new-pass').value;
    const avatarCode = document.getElementById('selected-avatar').value;
    const user = JSON.parse(localStorage.getItem('user'));

    let updated = false;

    // Đổi Avatar
    if (avatarCode !== user.AvatarCode) {
        const res = await AuthService.updateAvatar(user.Username, avatarCode);
        if (res.ok) {
            user.AvatarCode = avatarCode;
            localStorage.setItem('user', JSON.stringify(user));
            loadUserInfo();
            updated = true;
        } else {
            return alert("❌ Lỗi Avatar: " + res.data.message);
        }
    }

    // Đổi Pass
    if (newPass) {
        if (!oldPass) return alert("Cần nhập mật khẩu cũ để đổi pass!");
        
        const res = await AuthService.updatePassword({
            username: user.Username,
            oldPassword: oldPass,
            newPassword: newPass
        });

        if (res.ok) {
            updated = true;
            alert("Đổi mật khẩu thành công!");
        } else {
            return alert("❌ Lỗi Password: " + res.data.message);
        }
    }

    if (updated) hideModal('settings-modal');
    else alert("Không có gì thay đổi.");
}