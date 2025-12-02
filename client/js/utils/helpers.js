// --- 1. XỬ LÝ ÂM THANH ---
const sounds = {
    move: new Audio('assets/sounds/move.mp3'),
    capture: new Audio('assets/sounds/capture.mp3'),
    notify: new Audio('assets/sounds/notify.mp3')
};

export function playSound(type) {
    const sound = sounds[type];
    if (sound) {
        const clone = sound.cloneNode();
        clone.play().catch(() => {});
    }
}

// --- 2. XỬ LÝ MODAL (HỘP THOẠI) ---
export function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'flex';
}

export function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

// Hàm hiển thị Modal Xác nhận (Yes/No)
export function showConfirmModal(message, onYesCallback) {
    const modal = document.getElementById('confirm-modal');
    if (!modal) return;
    
    document.getElementById('confirm-message').innerText = message;
    
    const btnYes = document.getElementById('btn-confirm-yes');
    
    // Clone nút để xóa sự kiện cũ
    const newBtn = btnYes.cloneNode(true);
    btnYes.parentNode.replaceChild(newBtn, btnYes);
    
    newBtn.onclick = function() {
        onYesCallback();
        modal.style.display = 'none';
    };

    modal.style.display = 'flex';
}

export function showGameOverModal(title, message) {
    const modal = document.getElementById('game-over-modal');
    if (!modal) return;
    
    const titleEl = document.getElementById('modal-title');
    const msgEl = document.getElementById('modal-message');
    
    if(titleEl) titleEl.innerText = title;
    if(msgEl) msgEl.innerText = message;
    
    modal.style.display = 'flex';
}

// --- 3. TIỆN ÍCH KHÁC ---

export function toggleDisplay(showId, hideId) {
    const showEl = document.getElementById(showId);
    const hideEl = document.getElementById(hideId);
    if (showEl) showEl.style.display = 'block';
    if (hideEl) hideEl.style.display = 'none';
}

export function formatTime(seconds) {
    if (seconds < 0) return "00:00";
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

export function copyToClipboard(text) {
    if (!text) return;
    navigator.clipboard.writeText(text)
        .then(() => alert("Đã copy: " + text))
        .catch(err => console.error('Không thể copy', err));
}