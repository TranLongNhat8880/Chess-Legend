# ♟️ CHESS LEGEND - Real-time Online Chess Game

![Screenshot of Chess Legend](client/assets/images/Board.png) 
## 💡 Giới thiệu dự án

**Chess Legend** là một ứng dụng web chơi cờ vua trực tuyến thời gian thực (real-time), được phát triển với mục tiêu xây dựng một nền tảng thi đấu chuyên nghiệp, công bằng và hấp dẫn. Dự án đã hoàn thành 100% các chức năng cốt lõi theo yêu cầu phân tích thiết kế hệ thống.

## ✨ Tính năng chính (Core Features)

### 1. Hệ thống Trận đấu
* **PvP Online (Real-time):**
    * Hỗ trợ ghép trận nhanh (Matchmaking) tự động dựa trên ELO.
    * Tạo phòng riêng với tùy chọn mật khẩu bảo mật.
    * Đồng bộ nước đi tức thì qua WebSocket (Socket.io).
* **PvE (Đấu với Máy):**
    * Tích hợp engine **Stockfish** chạy trực tiếp trên trình duyệt (Web Worker), không tốn tài nguyên Server.
    * AI thông minh với nhiều cấp độ khó.

### 2. Hệ thống Xếp hạng & Người dùng
* **Hệ thống ELO:** Tính toán và cập nhật điểm ELO chuẩn xác sau mỗi ván đấu thắng/thua/hòa.
* **Trang Cá nhân (Profile):**
    * Xem thông tin hồ sơ, lịch sử đấu.
    * Cập nhật mật khẩu và thay đổi Avatar (chọn từ bộ sưu tập quân cờ pixel art).
    * Tính năng **Quên mật khẩu** (Gửi link reset qua email).

### 3. Tiện ích & Trải nghiệm
* **Lịch sử & Xem lại (Replay System):** Lưu trữ toàn bộ nước đi và cho phép xem lại (Replay) diễn biến chi tiết của từng ván đấu.
* **Đồng hồ thi đấu:** Đồng bộ thời gian thực từ Server để đảm bảo công bằng.
* **Chat:** Trò chuyện trực tiếp trong trận đấu.
* **Âm thanh:** Hiệu ứng âm thanh sinh động cho các sự kiện (đi quân, ăn quân, hết giờ...).

## 🛠️ Công nghệ sử dụng (Tech Stack)

| Lĩnh vực | Công nghệ | Mục đích |
| :--- | :--- | :--- |
| **Backend** | Node.js (Express) | Xây dựng RESTful API và xử lý logic game (Tính ELO, Xác thực, Quản lý phòng). |
| **Database**| SQL Server (MSSQL) | Lưu trữ bền vững dữ liệu người dùng, trận đấu và lịch sử nước đi. |
| **Real-time**| Socket.io | Giao tiếp hai chiều thời gian thực (WebSocket) giữa Client và Server. |
| **Frontend** | HTML5 / CSS3 / Vanilla JS | Giao diện Pixel Art và logic xử lý bàn cờ (Chess.js). |

## ⚙️ Hướng dẫn cài đặt (Installation Guide)

### 1. Database Setup
Mở **SQL Server Management Studio (SSMS)** và chạy đoạn script sau để tạo Database và các bảng cần thiết:

```sql
CREATE DATABASE ChessLegendDB;
GO
USE ChessLegendDB;
GO

-- 1. Bảng USERS: Lưu thông tin người chơi
CREATE TABLE Users (
    UserID INT PRIMARY KEY IDENTITY(1,1),
    Username NVARCHAR(50) NOT NULL UNIQUE,
    Email NVARCHAR(100) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(255) NOT NULL,
    AvatarCode NVARCHAR(50) DEFAULT 'WhitePawn',
    CurrentElo INT DEFAULT 600,
    TotalWins INT DEFAULT 0,
    TotalMatches INT DEFAULT 0,
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- 2. Bảng MATCHES: Lưu thông tin ván đấu
CREATE TABLE Matches (
    MatchID INT PRIMARY KEY IDENTITY(1,1),
    WhitePlayerID INT,
    BlackPlayerID INT,
    Mode NVARCHAR(20) DEFAULT 'PvP',
    StartTime DATETIME DEFAULT GETDATE(),
    EndTime DATETIME,
    WinnerID INT,
    EndReason NVARCHAR(50),
    FOREIGN KEY (WhitePlayerID) REFERENCES Users(UserID),
    FOREIGN KEY (BlackPlayerID) REFERENCES Users(UserID),
    FOREIGN KEY (WinnerID) REFERENCES Users(UserID)
);

-- 3. Bảng MOVES: Lưu chi tiết nước đi (cho tính năng Replay)
CREATE TABLE Moves (
    MoveID BIGINT PRIMARY KEY IDENTITY(1,1),
    MatchID INT NOT NULL,
    MoveNumber INT NOT NULL,
    PlayerColor CHAR(1) NOT NULL,
    FromSquare VARCHAR(2) NOT NULL,
    ToSquare VARCHAR(2) NOT NULL,
    PieceType VARCHAR(10),
    FENString VARCHAR(255),
    MoveTime DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (MatchID) REFERENCES Matches(MatchID)
);

-- 4. Bảng PasswordResets: Lưu token đổi mật khẩu
CREATE TABLE PasswordResets (
    Token NVARCHAR(100) PRIMARY KEY,
    UserID INT NOT NULL,
    CreatedAt DATETIME DEFAULT GETDATE(),
    ExpiresAt DATETIME NOT NULL,
    FOREIGN KEY (UserID) REFERENCES Users(UserID)
);

2. Cài đặt Project
Yêu cầu máy tính đã cài đặt Node.js.

Clone hoặc tải source code về máy.

Mở Terminal tại thư mục server/ và chạy lệnh:

npm install
Tạo file .env trong thư mục server/ và điền thông tin Database/Email của bạn:

PORT=5000
DB_USER=<Tên đăng nhập SQL>
DB_PASSWORD=<Mật khẩu SQL>
DB_SERVER=localhost
DB_NAME=ChessLegendDB

# Cấu hình gửi mail (Gmail App Password)
EMAIL_USER=<Email gửi mã reset>
EMAIL_PASS=<Mật khẩu ứng dụng Email>
3. Khởi chạy
Bước 1: Chạy Server Tại thư mục server/, chạy lệnh:

npx nodemon index.js
Bước 2: Chạy Client Sử dụng Live Server (Extension của VS Code) để mở file client/index.html.

Dự án được phát triển bởi Long Nhat (aka Chen Long Yi)

Facebook: https://www.facebook.com/long.nhat.776615