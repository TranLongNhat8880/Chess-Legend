document.addEventListener('DOMContentLoaded', () => {
    // 1. Kiểm tra xem có Token reset pass trên URL không (Trường hợp bấm link từ email)
    checkResetToken(); 
    
    // 2. Gán sự kiện cho form đăng nhập
    const loginForm = document.getElementById('login-form'); 
    if(loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault(); // Chặn reload trang
            login();
        });
    }
});

// --- PHẦN 1: LOGIC GIAO DIỆN (UI) ---

// Chuyển đổi qua lại giữa Đăng Nhập <-> Đăng Ký
function toggleForm() {
    const loginDiv = document.getElementById('login-form-container');
    const regDiv = document.getElementById('register-form-container');
    
    if (loginDiv.style.display === 'none') {
        loginDiv.style.display = 'block';
        regDiv.style.display = 'none';
    } else {
        loginDiv.style.display = 'none';
        regDiv.style.display = 'block';
    }
}

// Hiển thị Modal Quên Mật Khẩu (Và ẩn màn hình chính đi cho gọn)
function showForgotPasswordModal() {
    const mainScreen = document.getElementById('login-main-screen');
    const modal = document.getElementById('forgot-modal');
    
    if(mainScreen) mainScreen.style.display = 'none';
    if(modal) modal.style.display = 'flex';
    
    // Reset dòng thông báo trạng thái
    const statusEl = document.getElementById('forgot-status');
    if(statusEl) {
        statusEl.innerText = "";
        statusEl.style.color = "inherit";
    }
}

// Đóng Modal Quên Mật Khẩu (Hiện lại màn hình chính)
function closeForgotPasswordModal() {
    const mainScreen = document.getElementById('login-main-screen');
    const modal = document.getElementById('forgot-modal');

    if(modal) modal.style.display = 'none';
    if(mainScreen) mainScreen.style.display = 'block';
}


// --- PHẦN 2: LOGIC XỬ LÝ API ---

// 1. ĐĂNG NHẬP
async function login() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    if(!username || !password) return alert("Vui lòng nhập đủ thông tin!");

    try {
        const res = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (res.ok) {
            // Lưu thông tin user vào bộ nhớ
            localStorage.setItem('user', JSON.stringify(data.user));
            // Chuyển sang trang Sảnh chờ
            window.location.href = 'dashboard.html';
        } else {
            alert("❌ " + data.message);
        }
    } catch (err) { 
        console.error(err);
        alert("Lỗi kết nối Server."); 
    }
}

// 2. ĐĂNG KÝ
async function handleRegister() {
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    if(!username || !email || !password) return alert("Vui lòng nhập đủ thông tin!");

    try {
        const res = await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        const data = await res.json();

        if (res.ok) {
            alert("✅ " + data.message);
            toggleForm(); // Quay về form đăng nhập
        } else {
            alert("❌ " + data.message);
        }
    } catch (err) { alert("Lỗi kết nối Server."); }
}

// 3. GỬI YÊU CẦU RESET PASSWORD (Quên mật khẩu)
async function requestResetLink() {
    const emailInput = document.getElementById('forgot-email');
    const statusEl = document.getElementById('forgot-status');
    
    if(!emailInput || !statusEl) return;

    const email = emailInput.value.trim();
    
    // Hiện trạng thái đang xử lý
    statusEl.innerText = "⏳ Đang xử lý... Vui lòng chờ.";
    statusEl.style.color = "blue";

    if (!email) {
        statusEl.innerText = "⚠️ Vui lòng nhập email!";
        statusEl.style.color = "red";
        return;
    }

    try {
        const res = await fetch('http://localhost:5000/api/auth/forgot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        
        // Hiện kết quả từ Server
        if(res.ok) {
            statusEl.innerText = "✅ " + data.message;
            statusEl.style.color = "green";
        } else {
            statusEl.innerText = "❌ " + data.message;
            statusEl.style.color = "red";
        }
        
    } catch (err) {
        statusEl.innerText = "❌ Lỗi kết nối Server.";
        statusEl.style.color = "red";
    }
}

// 4. KIỂM TRA TOKEN TRÊN URL (Tự động chạy khi load trang)
function checkResetToken() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
        // Nếu có token -> Hiện Modal Đặt lại mật khẩu
        const resetField = document.getElementById('reset-token-field');
        const mainScreen = document.getElementById('login-main-screen');
        const resetModal = document.getElementById('reset-modal');

        if(resetField) resetField.value = token;
        
        if(mainScreen) mainScreen.style.display = 'none'; // Ẩn login
        if(resetModal) resetModal.style.display = 'flex'; // Hiện modal reset
        
        // Xóa token trên thanh địa chỉ cho đẹp (không reload trang)
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// 5. ĐẶT LẠI MẬT KHẨU CUỐI CÙNG
async function resetPasswordFinal() {
    const token = document.getElementById('reset-token-field').value;
    const newPassword = document.getElementById('reset-new-pass').value;

    if (!newPassword || newPassword.length < 5) return alert("Mật khẩu phải từ 5 ký tự trở lên.");

    try {
        const res = await fetch('http://localhost:5000/api/auth/reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, newPassword })
        });
        const data = await res.json();

        if (res.ok) {
            alert("✅ " + data.message);
            // Tải lại trang để về màn hình đăng nhập sạch sẽ
            window.location.href = 'index.html'; 
        } else {
            alert("❌ " + data.message);
        }

    } catch (err) {
        alert("Lỗi kết nối Server.");
    }
}