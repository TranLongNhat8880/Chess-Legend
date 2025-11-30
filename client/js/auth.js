// client/js/auth.js
// client/js/auth.js

// 1. Hàm chuyển đổi giữa Đăng nhập và Đăng ký
function toggleForm() {
    const loginForm = document.getElementById('login-form');
    const regForm = document.getElementById('register-form');

    if (loginForm.style.display === 'none') {
        loginForm.style.display = 'block';
        regForm.style.display = 'none';
    } else {
        loginForm.style.display = 'none';
        regForm.style.display = 'block';
    }
}

// 2. Hàm xử lý Đăng nhập
async function handleLogin() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    if (!username || !password) {
        alert("Vui lòng nhập tên và mật khẩu!");
        return;
    }

    try {
        const response = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            alert("✅ " + data.message);
            
            // QUAN TRỌNG: Lưu thông tin user vào bộ nhớ trình duyệt
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // Chuyển hướng sang trang Game
            window.location.href = 'dashboard.html'; 
            console.log("User Info:", data.user); // In ra để kiểm tra
        } else {
            alert("❌ " + data.message);
        }

    } catch (error) {
        console.error(error);
        alert("❌ Lỗi kết nối Server!");
    }
}

async function handleRegister() {
    // 1. Lấy dữ liệu từ ô nhập
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    // Kiểm tra rỗng
    if(!username || !email || !password) {
        alert("Vui lòng nhập đủ thông tin!");
        return;
    }

    // 2. Gửi dữ liệu xuống Server (API chúng ta vừa viết)
    try {
        const response = await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        // 3. Xử lý kết quả
        if (response.ok) {
            alert("✅ " + data.message);
            // Sau này sẽ chuyển hướng sang trang Login
        } else {
            alert("❌ Lỗi: " + data.message);
        }

    } catch (error) {
        console.error(error);
        alert("❌ Không thể kết nối tới Server!");
    }
}