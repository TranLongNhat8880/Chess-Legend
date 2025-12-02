const { sql } = require('../config/db');

// 1. Lấy thông tin chỉ số (ELO, Win/Loss)
const getUserStats = async (req, res) => {
    const { username } = req.body;
    try {
        const pool = await sql.connect();
        const result = await pool.request()
            .input('u', sql.NVarChar, username)
            .query('SELECT CurrentElo, TotalWins, TotalMatches, AvatarCode FROM Users WHERE Username = @u');
            
        if (result.recordset.length > 0) {
            res.json(result.recordset[0]);
        } else {
            res.status(404).json({ message: "Không tìm thấy user" });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// 2. Cập nhật Avatar
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

// 3. Đổi mật khẩu chủ động (Khi đang đăng nhập)
const changePassword = async (req, res) => {
    const { username, oldPassword, newPassword } = req.body;
    try {
        const pool = await sql.connect();
        
        // Check pass cũ
        const userResult = await pool.request()
            .input('u', sql.NVarChar, username)
            .input('p', sql.NVarChar, oldPassword)
            .query("SELECT * FROM Users WHERE Username = @u AND PasswordHash = @p");

        if (userResult.recordset.length === 0) return res.status(401).json({ message: "Mật khẩu cũ không đúng!" });
        
        // Update pass mới
        await pool.request()
            .input('u', sql.NVarChar, username)
            .input('newPass', sql.NVarChar, newPassword)
            .query("UPDATE Users SET PasswordHash = @newPass WHERE Username = @u");

        res.json({ message: "Đổi mật khẩu thành công!" });
    } catch (err) { res.status(500).json({ message: "Lỗi Server" }); }
};

module.exports = { getUserStats, updateAvatar, changePassword };