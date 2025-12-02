// client/js/services/api.js

const BASE_URL = 'http://localhost:5000/api';

// Hàm gửi request chung
async function request(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const res = await fetch(`${BASE_URL}${endpoint}`, options);
        
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
             return { 
                 ok: false, 
                 status: res.status, 
                 data: { message: "Lỗi Server: Phản hồi không phải JSON" } 
             };
        }

        const data = await res.json();
        return { 
            ok: res.ok, 
            status: res.status, 
            data: data 
        };

    } catch (err) {
        console.error("API Error:", err);
        return { 
            ok: false, 
            status: 500, 
            data: { message: "Không thể kết nối tới Server!" } 
        };
    }
}

export const AuthService = {
    login: (username, password) => request('/auth/login', 'POST', { username, password }),
    
    register: (username, email, password) => request('/auth/register', 'POST', { username, email, password }),
    
    forgotPassword: (email) => request('/auth/forgot', 'POST', { email }),
    
    resetPassword: (token, newPassword) => request('/auth/reset', 'POST', { token, newPassword }),
    
    getStats: (username) => request('/auth/stats', 'POST', { username }),
    
    updateAvatar: (username, avatarCode) => request('/auth/update/avatar', 'POST', { username, avatarCode }),
    
    updatePassword: (data) => request('/auth/update/password', 'POST', data),
    
    getHistory: (username) => request('/auth/history', 'POST', { username }),

    getReplay: (matchId) => request('/auth/replay', 'POST', { matchId })
};

// --- XUẤT CÁC HÀM ROOM ---
export const RoomService = {
    getList: () => request('/rooms', 'GET'),
    create: (roomId, password) => request('/rooms', 'POST', { roomId, password })
};