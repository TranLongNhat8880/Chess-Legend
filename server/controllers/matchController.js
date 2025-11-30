const { sql } = require('../config/db');

const getProbability = (rating1, rating2) => {
    return 1.0 / (1.0 + Math.pow(10, (rating1 - rating2) / 400));
};

// 1. LƯU KẾT QUẢ TRẬN ĐẤU
const endMatch = async (whiteId, blackId, winnerId, endReason, moveList = []) => {
    try {
        const pool = await sql.connect();
        const K = 30;

        // Lấy thông tin user
        const result = await pool.request()
            .input('wId', sql.Int, whiteId)
            .input('bId', sql.Int, blackId)
            .query(`SELECT UserID, CurrentElo FROM Users WHERE UserID IN (@wId, @bId)`);

        const whitePlayer = result.recordset.find(u => u.UserID === whiteId);
        const blackPlayer = result.recordset.find(u => u.UserID === blackId);

        if (!whitePlayer || !blackPlayer) return null;

        // Tính ELO
        const P_White = getProbability(blackPlayer.CurrentElo, whitePlayer.CurrentElo);
        const P_Black = getProbability(whitePlayer.CurrentElo, blackPlayer.CurrentElo);

        let S_White, S_Black;
        if (winnerId === whiteId) { S_White = 1; S_Black = 0; }
        else if (winnerId === blackId) { S_White = 0; S_Black = 1; }
        else { S_White = 0.5; S_Black = 0.5; }

        let newEloWhite = Math.round(whitePlayer.CurrentElo + K * (S_White - P_White));
        let newEloBlack = Math.round(blackPlayer.CurrentElo + K * (S_Black - P_Black));

        // Update DB
        await pool.request().input('nElo', sql.Int, newEloWhite).input('uId', sql.Int, whiteId).query(`UPDATE Users SET CurrentElo = @nElo, TotalWins = TotalWins + ${(winnerId === whiteId)?1:0}, TotalMatches = TotalMatches + 1 WHERE UserID = @uId`);
        await pool.request().input('nElo', sql.Int, newEloBlack).input('uId', sql.Int, blackId).query(`UPDATE Users SET CurrentElo = @nElo, TotalWins = TotalWins + ${(winnerId === blackId)?1:0}, TotalMatches = TotalMatches + 1 WHERE UserID = @uId`);

        const matchResult = await pool.request()
            .input('wId', sql.Int, whiteId).input('bId', sql.Int, blackId).input('winId', sql.Int, winnerId).input('reason', sql.NVarChar, endReason)
            .query(`INSERT INTO Matches (WhitePlayerID, BlackPlayerID, WinnerID, EndReason, EndTime) OUTPUT INSERTED.MatchID VALUES (@wId, @bId, @winId, @reason, GETDATE())`);
        
        const newMatchId = matchResult.recordset[0].MatchID;

        if (moveList.length > 0 && newMatchId) {
            const table = new sql.Table('Moves');
            table.create = false;
            table.columns.add('MatchID', sql.Int, { nullable: false });
            table.columns.add('MoveNumber', sql.Int, { nullable: false });
            table.columns.add('PlayerColor', sql.Char(1), { nullable: false });
            table.columns.add('FromSquare', sql.VarChar(2), { nullable: false });
            table.columns.add('ToSquare', sql.VarChar(2), { nullable: false });
            table.columns.add('PieceType', sql.VarChar(10), { nullable: true });
            table.columns.add('FENString', sql.VarChar(255), { nullable: true });
            table.columns.add('MoveTime', sql.DateTime, { nullable: true });

            moveList.forEach((move, index) => {
                table.rows.add(newMatchId, index + 1, move.color, move.from, move.to, move.piece, move.fen || null, new Date());
            });
            const req = new sql.Request(pool);
            await req.bulk(table);
        }

        return { white: { id: whiteId, newElo: newEloWhite }, black: { id: blackId, newElo: newEloBlack } };
    } catch (err) { console.error("DB Error:", err); return null; }
};

// 2. LẤY LỊCH SỬ ĐẤU (Hàm bạn đang thiếu hoặc lỗi)
const getMatchHistory = async (req, res) => {
    const { username } = req.body; 
    try {
        const pool = await sql.connect();
        const userResult = await pool.request().input('u', sql.NVarChar, username).query("SELECT UserID FROM Users WHERE Username = @u");
        if (userResult.recordset.length === 0) return res.status(404).json({ message: "User not found" });
        
        const userId = userResult.recordset[0].UserID;

        const historyResult = await pool.request().input('uid', sql.Int, userId).query(`
            SELECT TOP 10 m.MatchID, m.EndTime, m.EndReason, m.WinnerID,
                u1.Username as WhiteName, u2.Username as BlackName
            FROM Matches m
            JOIN Users u1 ON m.WhitePlayerID = u1.UserID
            JOIN Users u2 ON m.BlackPlayerID = u2.UserID
            WHERE m.WhitePlayerID = @uid OR m.BlackPlayerID = @uid
            ORDER BY m.EndTime DESC
        `);

        const history = historyResult.recordset.map(match => {
            const isWhite = (match.WhiteName === username);
            const result = (match.WinnerID === userId) ? "THẮNG" : (match.WinnerID ? "THUA" : "Hòa");
            return {
                id: match.MatchID,
                date: match.EndTime,
                opponent: isWhite ? match.BlackName : match.WhiteName,
                result: result,
                reason: match.EndReason,
                role: isWhite ? "Trắng" : "Đen"
            };
        });
        res.json(history);
    } catch (err) { res.status(500).json({ message: "Server Error" }); }
};

// 3. LẤY CHI TIẾT NƯỚC ĐI
const getMatchMoves = async (req, res) => {
    const { matchId } = req.body;
    try {
        const pool = await sql.connect();
        const matchResult = await pool.request().input('mid', sql.Int, matchId).query(`
            SELECT m.*, u1.Username as WhiteName, u2.Username as BlackName 
            FROM Matches m JOIN Users u1 ON m.WhitePlayerID = u1.UserID JOIN Users u2 ON m.BlackPlayerID = u2.UserID
            WHERE m.MatchID = @mid
        `);
        if (matchResult.recordset.length === 0) return res.status(404).json({ message: "Not found" });

        const movesResult = await pool.request().input('mid', sql.Int, matchId).query(`SELECT FromSquare, ToSquare, PieceType, FENString, PlayerColor FROM Moves WHERE MatchID = @mid ORDER BY MoveNumber ASC`);

        res.json({
            info: {
                white: matchResult.recordset[0].WhiteName,
                black: matchResult.recordset[0].BlackName,
                result: matchResult.recordset[0].EndReason,
                winnerId: matchResult.recordset[0].WinnerID,
                date: matchResult.recordset[0].EndTime
            },
            moves: movesResult.recordset
        });
    } catch (err) { res.status(500).json({ message: "Server Error" }); }
};

module.exports = { endMatch, getMatchHistory, getMatchMoves };