// Import các hàm từ Service và Utils
import { AuthService } from './services/api.js';
import { showModal, hideModal, toggleDisplay } from './utils/helpers.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Kiểm tra Token Reset (nếu có)
    checkResetToken(); 
    
    // 2. Gán sự kiện form Login
    const loginForm = document.getElementById('login-form'); 
    if(loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            login();
        });
    }
    
    // 3. Gán các hàm vào window để HTML gọi được (do dùng module)
    window.login = login;
    window.handleRegister = handleRegister;
    window.requestResetLink = requestResetLink;
    window.resetPasswordFinal = resetPasswordFinal;
    
    window.toggleForm = () => {
        const loginDisplay = document.getElementById('login-form-container').style.display;
        if (loginDisplay === 'none') {
            toggleDisplay('login-form-container', 'register-form-container');
        } else {
            toggleDisplay('register-form-container', 'login-form-container');
        }
    };

    window.showForgotPasswordModal = () => {
        document.getElementById('login-main-screen').style.display = 'none';
        showModal('forgot-modal');
        document.getElementById('forgot-status').innerText = "";
    };

    window.closeForgotPasswordModal = () => {
        hideModal('forgot-modal');
        document.getElementById('login-main-screen').style.display = 'block';
    };
});

// --- LOGIC GỌI API ---

async function login() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    if(!username || !password) return alert("Vui lòng nhập đủ thông tin!");

    // Gọi qua Service
    const res = await AuthService.login(username, password);

    if (res.ok) {
        localStorage.setItem('user', JSON.stringify(res.data.user));
        window.location.href = 'dashboard.html';
    } else {
        alert("❌ " + res.data.message);
    }
}

async function handleRegister() {
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    const res = await AuthService.register(username, email, password);

    if (res.ok) {
        alert("✅ " + res.data.message);
        window.toggleForm(); // Quay về login
    } else {
        alert("❌ " + res.data.message);
    }
}

async function requestResetLink() {
    const email = document.getElementById('forgot-email').value;
    const statusEl = document.getElementById('forgot-status');
    
    statusEl.innerText = "⏳ Đang xử lý...";
    statusEl.style.color = "blue";

    const res = await AuthService.forgotPassword(email);
    
    if(res.ok) {
        statusEl.innerText = "✅ " + res.data.message;
        statusEl.style.color = "green";
    } else {
        statusEl.innerText = "❌ " + res.data.message;
        statusEl.style.color = "red";
    }
}

async function resetPasswordFinal() {
    const token = document.getElementById('reset-token-field').value;
    const newPassword = document.getElementById('reset-new-pass').value;

    const res = await AuthService.resetPassword(token, newPassword);

    if (res.ok) {
        alert("✅ " + res.data.message);
        window.location.href = 'index.html'; 
    } else {
        alert("❌ " + res.data.message);
    }
}

function checkResetToken() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
        document.getElementById('reset-token-field').value = token;
        document.getElementById('login-main-screen').style.display = 'none';
        showModal('reset-modal');
        history.replaceState(null, '', 'index.html');
    }
}