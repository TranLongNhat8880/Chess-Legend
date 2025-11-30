# ♟️ CHESS LEGEND - Real-time Online Chess Game

![Screenshot of Chess Legend in-game interface] 

## 💡 Giới thiệu dự án

**Chess Legend** là một ứng dụng web chơi cờ vua trực tuyến thời gian thực (real-time), được phát triển nhằm mục đích mô phỏng một hệ thống xếp hạng và thi đấu chuyên nghiệp. Dự án đã hoàn thành 100% các chức năng cốt lõi theo báo cáo PTTK.

## ✨ Tính năng chính (Core Features)

* **PvP Online (Real-time):** Hỗ trợ ghép trận nhanh (Matchmaking) tự động và tạo phòng riêng có mật khẩu.
* **Hệ thống ELO:** Tính toán, cập nhật ELO chuẩn xác và hiển thị chỉ số thắng/thua sau mỗi ván đấu.
* **Trang Cá nhân (Profile):** Cho phép xem hồ sơ, cập nhật mật khẩu và thay đổi Avatar (chọn từ kho quân cờ).
* **Lịch sử & Xem lại (Replay System):** Lưu trữ toàn bộ nước đi (`Moves` table) và cho phép người chơi xem lại diễn biến chi tiết của các trận đấu đã qua.
* **PvE (Đấu với Máy):** Tích hợp engine **Stockfish** chạy trên Web Worker (client-side).
* **Tiện ích:** Đồng hồ đếm ngược (Chess Clock) đồng bộ, Chat trực tiếp trong trận đấu, Hiệu ứng âm thanh (FX).

## 🛠️ Công nghệ sử dụng (Tech Stack)

| Lĩnh vực | Công nghệ | Mục đích |
| :--- | :--- | :--- |
| **Backend** | Node.js (Express) | Xây dựng API và xử lý logic game (Tính ELO, Xác thực). |
| **Database**| SQL Server (MSSQL) | Lưu trữ vĩnh viễn tài khoản, ELO và lịch sử trận đấu (Persistence). |
| **Real-time**| Socket.io | Đồng bộ nước đi, đồng hồ và chat tức thì. |
| **Frontend** | HTML5 / CSS3 / Vanilla JS | Giao diện và logic cờ vua (Chess.js). |

## ⚙️ Hướng dẫn cài đặt (Installation Guide)

### 1. Database Setup
Mở SQL Server Management Studio (SSMS) và chạy các lệnh tạo bảng:

```sql
CREATE DATABASE ChessLegendDB;
GO
USE ChessLegendDB;
GO
-- Tạo Database
CREATE DATABASE ChessLegendDB;
GO
USE ChessLegendDB;
GO

-- 1. Bảng USERS: Lưu thông tin người chơi
CREATE TABLE Users (
    UserID INT PRIMARY KEY IDENTITY(1,1), -- ID tự tăng
    Username NVARCHAR(50) NOT NULL UNIQUE, -- Tên đăng nhập [cite: 9]
    Email NVARCHAR(100) NOT NULL UNIQUE,   -- Email [cite: 9]
    PasswordHash NVARCHAR(255) NOT NULL,   -- Mật khẩu đã mã hóa (Không lưu text thường)
    AvatarCode NVARCHAR(50) DEFAULT 'pawn_wood', -- Mã avatar (chọn từ danh sách có sẵn) [cite: 66]
    CurrentElo INT DEFAULT 600,            -- Elo mặc định là 600 
    TotalWins INT DEFAULT 0,               -- Số trận thắng (để hiện chỉ số phụ)
    TotalMatches INT DEFAULT 0,            -- Tổng số trận đã chơi
    CreatedAt DATETIME DEFAULT GETDATE()   -- Ngày tạo tài khoản
);

-- 2. Bảng MATCHES: Lưu thông tin tổng quan của ván đấu (Header)
CREATE TABLE Matches (
    MatchID INT PRIMARY KEY IDENTITY(1,1),
    WhitePlayerID INT,                     -- ID người cầm quân Trắng
    BlackPlayerID INT,                     -- ID người cầm quân Đen (Nếu NULL thì là AI/PvE)
    Mode NVARCHAR(20) DEFAULT 'PvP',       -- 'PvP' hoặc 'PvE' 
    StartTime DATETIME DEFAULT GETDATE(),  -- Thời gian bắt đầu
    EndTime DATETIME,                      -- Thời gian kết thúc
    WinnerID INT,                          -- ID người thắng (NULL nếu hòa)
    EndReason NVARCHAR(50),                -- Lý do: 'Checkmate', 'Resign' (đầu hàng), 'Timeout', 'Stalemate' [cite: 30, 31]
    
    -- Ràng buộc khóa ngoại
    FOREIGN KEY (WhitePlayerID) REFERENCES Users(UserID),
    FOREIGN KEY (BlackPlayerID) REFERENCES Users(UserID),
    FOREIGN KEY (WinnerID) REFERENCES Users(UserID)
);

-- 3. Bảng MOVES: Lưu chi tiết từng nước đi (để Replay) [cite: 34, 35]
-- Cách này giúp bạn truy vấn lại toàn bộ ván đấu để hiển thị
CREATE TABLE Moves (
    MoveID BIGINT PRIMARY KEY IDENTITY(1,1),
    MatchID INT NOT NULL,
    MoveNumber INT NOT NULL,               -- Nước đi thứ mấy (1, 2, 3...)
    PlayerColor CHAR(1) NOT NULL,          -- 'W' (Trắng) hoặc 'B' (Đen)
    FromSquare VARCHAR(2) NOT NULL,        -- Ví dụ: 'e2'
    ToSquare VARCHAR(2) NOT NULL,          -- Ví dụ: 'e4'
    PieceType VARCHAR(10),                 -- Loại quân: 'Pawn', 'Knight'...
    FENString VARCHAR(255),                -- Trạng thái bàn cờ sau nước đi (Dùng để load lại nhanh)
    MoveTime DATETIME DEFAULT GETDATE(),   -- Thời điểm đi (để tính thời gian suy nghĩ nếu cần)
    
    FOREIGN KEY (MatchID) REFERENCES Matches(MatchID)
);

-- 4. Bảng CHAT_LOGS (Tùy chọn): Lưu lịch sử chat [cite: 51]
CREATE TABLE ChatLogs (
    ChatID BIGINT PRIMARY KEY IDENTITY(1,1),
    MatchID INT NOT NULL,
    SenderID INT NOT NULL,
    Message NVARCHAR(255),                 -- Nội dung chat
    SentAt DATETIME DEFAULT GETDATE(),
    
    FOREIGN KEY (MatchID) REFERENCES Matches(MatchID),
    FOREIGN KEY (SenderID) REFERENCES Users(UserID)
);