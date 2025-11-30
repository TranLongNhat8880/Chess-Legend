const { sql } = require('../config/db');

// 1. Đăng ký
const registerUser = async (req, res) => {
    const { username, email, password } = req.body;
    try {
        if (!username || !email || !password) return res.status(400).json({ message: 'Thiếu thông tin!' });
        const pool = await sql.connect();
        // Lưu ý: Default AvatarCode là 'WhitePawn' thay vì 'pawn_wood' để tránh lỗi ảnh
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

// 2. Đăng nhập
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

// 3. Lấy ELO
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

// 4. Cập nhật thông tin (Avatar/Pass)
const updateProfile = async (req, res) => {
    const { username, oldPassword, newPassword, avatarCode } = req.body;
    try {
        const pool = await sql.connect();
        
        // Check pass cũ
        const userResult = await pool.request()
            .input('u', sql.NVarChar, username)
            .input('p', sql.NVarChar, oldPassword)
            .query("SELECT * FROM Users WHERE Username = @u AND PasswordHash = @p");

        if (userResult.recordset.length === 0) return res.status(401).json({ message: "Mật khẩu cũ không đúng!" });

        let query = "UPDATE Users SET ";
        const request = pool.request().input('u', sql.NVarChar, username);
        let updates = [];
        
        if (avatarCode) {
            updates.push("AvatarCode = @avatar");
            request.input('avatar', sql.NVarChar, avatarCode);
        }
        if (newPassword && newPassword.trim() !== "") {
            updates.push("PasswordHash = @newPass");
            request.input('newPass', sql.NVarChar, newPassword);
        }

        if (updates.length === 0) return res.json({ message: "Không có gì thay đổi." });

        query += updates.join(", ") + " WHERE Username = @u";
        await request.query(query);

        res.json({ message: "Cập nhật thành công!", avatarCode: avatarCode });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi Server" });
    }
};

module.exports = { registerUser, loginUser, getUserStats, updateProfile };