//Lưu modal lịch sử đấu
import { AuthService } from '../services/api.js';
import { showModal } from '../utils/helpers.js';

export async function showHistoryModal() {
    showModal('history-modal');
    const tbody = document.getElementById('history-list-body');
    const loading = document.getElementById('history-loading');
    
    tbody.innerHTML = '';
    loading.style.display = 'block';

    const user = JSON.parse(localStorage.getItem('user'));
    const res = await AuthService.getHistory(user.Username);

    loading.style.display = 'none';

    if (!res.ok || res.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">Chưa có trận đấu nào.</td></tr>';
        return;
    }

    res.data.forEach(m => {
        const tr = document.createElement('tr');
        tr.style.cursor = "pointer";
        tr.title = "Bấm để xem lại";
        tr.onclick = () => window.open(`replay.html?id=${m.id}`, '_blank', 'width=1000,height=700');
        
        tr.onmouseover = () => tr.style.backgroundColor = "#e0e0e0";
        tr.onmouseout = () => tr.style.backgroundColor = "white";

        let color = m.result === 'THẮNG' ? '#2e7d32' : (m.result === 'THUA' ? '#c62828' : 'black');
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
}