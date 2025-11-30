const { sql } = require('../config/db');
const crypto = require('crypto'); // Thư viện có sẵn của Node.js
const nodemailer = require('nodemailer'); // 1. Import thư viện
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// 1. Đăng ký (Giữ nguyên)
const registerUser = async (req, res) => {
    const { username, email, password } = req.body;
    try {
        if (!username || !email || !password) return res.status(400).json({ message: 'Thiếu thông tin!' });
        const pool = await sql.connect();
        await pool.request()
            .input('Username', sql.NVarChar, username)
            .input('Email', sql.NVarChar, email)
            .input('PasswordHash', sql.NVarChar, password)
            .query(`INSERT INTO Users (Username, Email, PasswordHash, CurrentElo, AvatarCode) VALUES (@Username, @Email, @PasswordHash, 600, 'WhitePawn')`);
        res.status(201).json({ message: 'Đăng ký thành công!' });
    } catch (error) {
        if (error.number === 2627) return res.status(400).json({ message: 'Tên hoặc Email đã tồn tại!' });
        res.status(500).json({ message: 'Lỗi server: ' + error.message });
    }
};

// 2. Đăng nhập (Giữ nguyên)
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
            res.status(401).json({ message: 'Sai thông tin!' });
        }
    } catch (error) { res.status(500).json({ message: 'Lỗi server' }); }
};

// 3. Lấy ELO (Giữ nguyên)
const getUserStats = async (req, res) => {
    const { username } = req.body;
    try {
        const pool = await sql.connect();
        const result = await pool.request()
            .input('u', sql.NVarChar, username)
            .query('SELECT CurrentElo, TotalWins, TotalMatches FROM Users WHERE Username = @u');
        if (result.recordset.length > 0) res.json(result.recordset[0]);
        else res.status(404).json({ message: "Không tìm thấy user" });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

// --- MỚI: TÁCH RIÊNG CẬP NHẬT ---

// 4. Cập nhật AVATAR
const updateAvatar = async (req, res) => {
    const { username, avatarCode } = req.body;
    try {
        const pool = await sql.connect();
        await pool.request()
            .input('u', sql.NVarChar, username)
            .input('avt', sql.NVarChar, avatarCode)
            .query("UPDATE Users SET AvatarCode = @avt WHERE Username = @u");
        res.json({ message: "Đổi Avatar thành công!" });
    } catch (err) { res.status(500).json({ message: "Lỗi server" }); }
};

// 5. Cập nhật MẬT KHẨU (Có check pass cũ)
const updatePassword = async (req, res) => {
    const { username, oldPassword, newPassword } = req.body;
    try {
        const pool = await sql.connect();
        // Check pass cũ
        const check = await pool.request()
            .input('u', sql.NVarChar, username)
            .input('p', sql.NVarChar, oldPassword)
            .query("SELECT UserID FROM Users WHERE Username = @u AND PasswordHash = @p");
            
        if (check.recordset.length === 0) return res.status(401).json({ message: "Mật khẩu cũ không đúng!" });

        // Update pass mới
        await pool.request()
            .input('u', sql.NVarChar, username)
            .input('np', sql.NVarChar, newPassword)
            .query("UPDATE Users SET PasswordHash = @np WHERE Username = @u");
            
        res.json({ message: "Đổi mật khẩu thành công!" });
    } catch (err) { res.status(500).json({ message: "Lỗi server" }); }
};

// --- MỚI: QUÊN MẬT KHẨU ---

// 6. Yêu cầu Reset (Tạo Token)
const requestPasswordReset = async (req, res) => {
    const { email } = req.body;
    try {
        const pool = await sql.connect();
        const userRes = await pool.request().input('e', sql.NVarChar, email).query("SELECT UserID, Username FROM Users WHERE Email = @e");
        
        if (userRes.recordset.length === 0) {
            // Vẫn báo thành công giả để bảo mật
            return res.json({ message: "Nếu email tồn tại, link reset sẽ được gửi." });
        }

        const user = userRes.recordset[0];
        const token = crypto.randomBytes(20).toString('hex');
        const expires = new Date(Date.now() + 3600000); // 1 giờ

        // Lưu DB
        await pool.request().input('uid', sql.Int, user.UserID).query("DELETE FROM PasswordResets WHERE UserID = @uid");
        await pool.request()
            .input('uid', sql.Int, user.UserID)
            .input('token', sql.NVarChar, token)
            .input('exp', sql.DateTime, expires)
            .query("INSERT INTO PasswordResets (UserID, Token, ExpiresAt) VALUES (@uid, @token, @exp)");

        // Link Reset
        const resetLink = `http://127.0.0.1:5500/client/index.html?token=${token}`;

        // GỬI EMAIL THẬT
        const mailOptions = {
            from: `"Chess Legend Support" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: '🔒 Yêu cầu đặt lại mật khẩu - Chess Legend',
            html: `
                <h3>Xin chào ${user.Username},</h3>
                <p>Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản Chess Legend.</p>
                <p>Vui lòng nhấn vào link bên dưới để tiếp tục (Link hết hạn sau 1 giờ):</p>
                <a href="${resetLink}" style="background:#388e3c; color:white; padding:10px 20px; text-decoration:none; border-radius:5px;">ĐẶT LẠI MẬT KHẨU</a>
                <p>Hoặc copy link này: ${resetLink}</p>
                <p>Nếu không phải bạn, vui lòng bỏ qua email này.</p>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Email đã gửi tới: ${email}`);

        // Trả về thông báo chuẩn (Không gửi link debug về client nữa)
        res.json({ message: "Đã gửi email khôi phục! Vui lòng kiểm tra Hộp thư đến (hoặc Spam)." });

    } catch (err) {
        console.error("Lỗi gửi mail:", err);
        res.status(500).json({ message: "Lỗi Server khi gửi mail." });
    }
};

// 7. Thực hiện Reset (Dùng Token)
// 7. Reset Password (Debug Version - In lỗi chi tiết ra Console Server)
const resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;
    
    console.log("--------------- DEBUG RESET PASSWORD ---------------");
    console.log("👉 Token Client gửi lên:", token);

    try {
        const pool = await sql.connect();
        
        // 1. Kiểm tra xem Token có tồn tại trong DB không (Bỏ qua check hạn để debug)
        const checkToken = await pool.request()
            .input('token', sql.NVarChar, token)
            .query("SELECT * FROM PasswordResets WHERE Token = @token");

        if (checkToken.recordset.length === 0) {
            console.log("❌ LỖI: Token này không tìm thấy trong Database!");
            console.log("   -> Nguyên nhân: Có thể bạn đã yêu cầu link mới, làm link cũ bị xóa.");
            return res.status(400).json({ message: "Link này không tồn tại (Vui lòng lấy link mới nhất)." });
        }
        
        const record = checkToken.recordset[0];
        console.log("✅ Tìm thấy Token trong DB. UserID:", record.UserID);
        
        // 2. Kiểm tra hết hạn
        const now = new Date();
        if (record.ExpiresAt < now) {
            console.log("❌ LỖI: Token đã hết hạn lúc:", record.ExpiresAt);
            return res.status(400).json({ message: "Link đã hết hạn sử dụng." });
        }

        const userId = record.UserID;

        // 3. Đổi mật khẩu
        await pool.request()
            .input('newPass', sql.NVarChar, newPassword)
            .input('userId', sql.Int, userId)
            .query("UPDATE Users SET PasswordHash = @newPass WHERE UserID = @userId");

        // 4. Xóa token
        await pool.request().input('token', sql.NVarChar, token).query("DELETE FROM PasswordResets WHERE Token = @token");

        console.log("✅ Đổi mật khẩu thành công!");
        res.json({ message: "Đổi mật khẩu thành công! Hãy đăng nhập lại." });

    } catch (error) {
        console.error("❌ Lỗi Server:", error);
        res.status(500).json({ message: "Lỗi server nội bộ" });
    }
};

module.exports = { registerUser, loginUser, getUserStats, updateAvatar, updatePassword, requestPasswordReset, resetPassword };