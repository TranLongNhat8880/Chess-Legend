const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: true, 
        trustServerCertificate: true 
    }
};

const connectDB = async () => {
    try {
        let pool = await sql.connect(config);
        console.log("Đã kết nối thành công tới SQL Server!");
        return pool;
    } catch (err) {
        console.log("Lỗi kết nối Database:", err);
    }
};

module.exports = { connectDB, sql };