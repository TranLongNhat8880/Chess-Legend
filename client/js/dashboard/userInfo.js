//Show tên user, ELO, Avatar
import { AuthService } from '../services/api.js';

export function loadUserInfo() {
    const userJson = localStorage.getItem('user');
    if (!userJson) {
        window.location.href = 'index.html';
        return;
    }
    const user = JSON.parse(userJson);
    
    const nameEl = document.getElementById('dash-name');
    const eloEl = document.getElementById('dash-elo');
    const avatarEl = document.getElementById('dash-avatar');

    if (nameEl) nameEl.innerText = user.Username;
    if (eloEl) eloEl.innerText = user.CurrentElo;
    
    // Fix lỗi ảnh cũ
    let avatar = user.AvatarCode || 'WhitePawn';
    if (avatar === 'pawn_wood') avatar = 'WhitePawn';
    
    if (avatarEl) avatarEl.src = `assets/images/${avatar}.png`;
}

export async function updateRealTimeElo() {
    const userJson = localStorage.getItem('user');
    if (!userJson) return;
    const user = JSON.parse(userJson);

    const res = await AuthService.getStats(user.Username);
    
    if (res.ok) {
        const eloEl = document.getElementById('dash-elo');
        if (eloEl) eloEl.innerText = res.data.CurrentElo;
        
        // Update localStorage
        user.CurrentElo = res.data.CurrentElo;
        user.TotalWins = res.data.TotalWins;
        localStorage.setItem('user', JSON.stringify(user));
    }
}