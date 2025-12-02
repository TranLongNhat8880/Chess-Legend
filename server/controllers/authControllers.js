const { sql } = require('../config/db');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
require('dotenv').config();

// --- CẤU HÌNH GỬI MAIL ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// 1. ĐĂNG KÝ
const registerUser = async (req, res) => {
    const { username, email, password } = req.body;
    try {
        if (!username || !email || !password) return res.status(400).json({ message: 'Thiếu thông tin!' });
        
        const pool = await sql.connect();
        // Mặc định Avatar là 'WhitePawn' (Tốt Trắng) để tránh lỗi ảnh
        await pool.request()
            .input('Username', sql.NVarChar, username)
            .input('Email', sql.NVarChar, email)
            .input('PasswordHash', sql.NVarChar, password)
            .query(`INSERT INTO Users (Username, Email, PasswordHash, CurrentElo, AvatarCode) VALUES (@Username, @Email, @PasswordHash, 600, 'WhitePawn')`);
            
        res.status(201).json({ message: 'Đăng ký thành công!' });
    } catch (error) {
        if (error.number === 2627) return res.status(400).json({ message: 'Tên đăng nhập hoặc Email đã tồn tại!' });
        res.status(500).json({ message: 'Lỗi server: ' + error.message });
    }
};

// 2. ĐĂNG NHẬP
const loginUser = async (req, res) => {
    const { username, password } = req.body;
    try {
        const pool = await sql.connect();
        const result = await pool.request()
            .input('Username', sql.NVarChar, username)
            .input('Password', sql.NVarChar, password)
            .query(`SELECT UserID, Username, CurrentElo, AvatarCode FROM Users WHERE Username = @Username AND PasswordHash = @Password`);
        
        if (result.recordset.length > 0) {
            res.json({ message: 'Đăng nhập thành công!', user: result.recordset[0] });
        } else {
            res.status(401).json({ message: 'Sai tên đăng nhập hoặc mật khẩu!' });
        }
    } catch (error) { res.status(500).json({ message: 'Lỗi server' }); }
};

// 3. LẤY THÔNG TIN ELO (STATS)
const getUserStats = async (req, res) => {
    const { username } = req.body;
    try {
        const pool = await sql.connect();
        const result = await pool.request()
            .input('u', sql.NVarChar, username)
            .query('SELECT CurrentElo, TotalWins, TotalMatches FROM Users WHERE Username = @u');
            
        if (result.recordset.length > 0) {
            res.json(result.recordset[0]);
        } else {
            res.status(404).json({ message: "Không tìm thấy user" });
        }
    } catch (err) { res.status(500).json({ message: err.message }); }
};

// 4. CẬP NHẬT AVATAR
const updateAvatar = async (req, res) => {
    const { username, avatarCode } = req.body;
    try {
        const pool = await sql.connect();
        await pool.request()
            .input('u', sql.NVarChar, username)
            .input('avatar', sql.NVarChar, avatarCode)
            .query("UPDATE Users SET AvatarCode = @avatar WHERE Username = @u");
        res.json({ message: "Cập nhật Avatar thành công!", avatarCode });
    } catch (err) { res.status(500).json({ message: "Lỗi Server" }); }
};

// 5. CẬP NHẬT MẬT KHẨU (CHỦ ĐỘNG)
const updatePassword = async (req, res) => {
    const { username, oldPassword, newPassword } = req.body;
    try {
        const pool = await sql.connect();
        
        // Kiểm tra mật khẩu cũ
        const userResult = await pool.request()
            .input('u', sql.NVarChar, username)
            .input('p', sql.NVarChar, oldPassword)
            .query("SELECT * FROM Users WHERE Username = @u AND PasswordHash = @p");

        if (userResult.recordset.length === 0) return res.status(401).json({ message: "Mật khẩu cũ không đúng!" });
        if (!newPassword || newPassword.trim() === "") return res.status(400).json({ message: "Mật khẩu mới không được trống." });

        // Cập nhật mật khẩu mới
        await pool.request()
            .input('u', sql.NVarChar, username)
            .input('newPass', sql.NVarChar, newPassword)
            .query("UPDATE Users SET PasswordHash = @newPass WHERE Username = @u");

        res.json({ message: "Đổi mật khẩu thành công!" });
    } catch (err) { res.status(500).json({ message: "Lỗi Server" }); }
};

// 6. YÊU CẦU QUÊN MẬT KHẨU (GỬI EMAIL)
const requestPasswordReset = async (req, res) => {
    const { email } = req.body;
    console.log("📨 Đang xử lý yêu cầu reset cho:", email);

    try {
        const pool = await sql.connect();
        const userRes = await pool.request().input('e', sql.NVarChar, email).query("SELECT UserID, Username FROM Users WHERE Email = @e");
        
        if (userRes.recordset.length === 0) {
            return res.json({ message: "Nếu email tồn tại, link reset sẽ được gửi." });
        }

        const user = userRes.recordset[0];
        const token = crypto.randomBytes(20).toString('hex');
        const expires = new Date(Date.now() + 3600000); // 1 giờ

        // Xóa token cũ & Tạo token mới
        await pool.request().input('uid', sql.Int, user.UserID).query("DELETE FROM PasswordResets WHERE UserID = @uid");
        await pool.request()
            .input('uid', sql.Int, user.UserID)
            .input('token', sql.NVarChar, token)
            .input('exp', sql.DateTime, expires)
            .query("INSERT INTO PasswordResets (UserID, Token, ExpiresAt) VALUES (@uid, @token, @exp)");

        const resetLink = `http://127.0.0.1:5500/client/index.html?token=${token}`;

        // Template Email HTML
        const emailHtml = `
        <div style="font-family: 'Segoe UI', sans-serif; background-color: #f4f4f4; padding: 40px 0;">
            <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                <div style="background-color: #5d4037; padding: 25px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; letter-spacing: 1px;">♟️ CHESS LEGEND</h1>
                </div>
                <div style="padding: 30px; text-align: center; color: #333;">
                    <h2 style="color: #5d4037; margin-top: 0;">Yêu cầu Đặt lại Mật khẩu</h2>
                    <p style="font-size: 16px; color: #555;">Xin chào <strong>${user.Username}</strong>,</p>
                    <p style="margin-bottom: 30px;">Bạn vừa yêu cầu khôi phục mật khẩu. Nhấn vào nút bên dưới để tiếp tục:</p>
                    
                    <a href="${resetLink}" style="display: inline-block; background-color: #388e3c; color: #ffffff; text-decoration: none; padding: 12px 25px; font-size: 16px; font-weight: bold; border-radius: 5px; transition: background 0.3s;">
                        ĐẶT LẠI MẬT KHẨU
                    </a>

                    <p style="margin-top: 30px; font-size: 13px; color: #999;">
                        Link này sẽ hết hạn sau 1 giờ.<br>
                        Nếu nút không hoạt động, hãy copy link này:<br>
                        <a href="${resetLink}" style="color: #388e3c;">${resetLink}</a>
                    </p>
                </div>
            </div>
        </div>
        `;

        // Gửi mail
        await transporter.sendMail({
            from: `"Chess Legend Support" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: '🔑 Khôi phục mật khẩu - Chess Legend',
            html: emailHtml
        });

        res.json({ message: "Đã gửi email khôi phục! Vui lòng kiểm tra hộp thư." });

    } catch (err) { 
        console.error(err); 
        res.status(500).json({ message: "Lỗi Server khi gửi mail." }); 
    }
};

// 7. ĐẶT LẠI MẬT KHẨU (RESET BẰNG TOKEN)
const resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;
    
    console.log("🔒 Đang reset pass với Token:", token);

    if (!token) return res.status(400).json({ message: "Lỗi: Token rỗng. Đừng F5 trang web!" });

    try {
        const pool = await sql.connect();
        
        // Kiểm tra Token
        const checkToken = await pool.request()
            .input('token', sql.NVarChar, token)
            .query("SELECT UserID FROM PasswordResets WHERE Token = @token AND ExpiresAt > GETDATE()");

        if (checkToken.recordset.length === 0) {
            return res.status(400).json({ message: "Link không hợp lệ hoặc đã hết hạn! Vui lòng yêu cầu lại." });
        }
        
        const userId = checkToken.recordset[0].UserID;

        // Cập nhật mật khẩu mới
        await pool.request()
            .input('np', sql.NVarChar, newPassword)
            .input('uid', sql.Int, userId)
            .query("UPDATE Users SET PasswordHash = @np WHERE UserID = @uid");

        // Xóa Token sau khi dùng
        await pool.request().input('token', sql.NVarChar, token).query("DELETE FROM PasswordResets WHERE Token = @token");

        console.log("✅ Đổi mật khẩu thành công cho UserID:", userId);
        res.json({ message: "Đổi mật khẩu thành công! Vui lòng đăng nhập lại." });

    } catch (error) {
        console.error("❌ Lỗi SQL:", error);
        res.status(500).json({ message: "Lỗi server" });
    }
};

// --- XUẤT ĐỦ 7 HÀM ---
module.exports = { 
    registerUser, 
    loginUser, 
    getUserStats, 
    updateAvatar, 
    updatePassword, 
    requestPasswordReset, 
    resetPassword 
};