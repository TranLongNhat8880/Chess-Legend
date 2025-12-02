// 1. Import các hàm từ các file con
import { loadUserInfo, updateRealTimeElo } from './dashboard/userInfo.js';
import { fetchRooms, createRoomUI, joinRoomById } from './dashboard/roomManager.js';
import { findMatch, goToGame, logout, joinRoom } from './dashboard/navigation.js'; // <-- Đã import findMatch
import { showHistoryModal } from './dashboard/history.js';
import { openSettings, saveSettings } from './dashboard/settings.js';

document.addEventListener('DOMContentLoaded', () => {
    // Chạy các hàm khởi tạo
    loadUserInfo();
    fetchRooms();
    updateRealTimeElo();

    // --- 👇 QUAN TRỌNG: GÁN HÀM RA WINDOW ĐỂ HTML GỌI ĐƯỢC 👇 ---
    window.logout = logout;
    window.createRoomUI = createRoomUI;
    window.joinRoomById = joinRoomById;
    window.fetchRooms = fetchRooms;
    
    // Đây là dòng sửa lỗi của bạn:
    window.findMatch = findMatch; 
    
    window.goToGame = goToGame;
    window.joinRoom = joinRoom; // Thêm cái này cho chắc nếu HTML có gọi
    
    window.showHistoryModal = showHistoryModal;
    window.openSettings = openSettings;
    window.saveSettings = saveSettings;
});