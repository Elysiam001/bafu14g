const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// --- KẾT NỐI DATABASE ---
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/taixiu_bafu";
mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ Đã kết nối MongoDB"))
    .catch(err => console.log("❌ Lỗi kết nối MongoDB:", err));

// --- LOGIC GAME (VÒNG LẶP VĨNH CỬU) ---
let gameState = {
    phase: 'betting', // betting, result
    timeLeft: 30,
    lastDices: [1, 2, 3],
    totalBetTai: 0,
    totalBetXiu: 0,
    history: []
};

function runGameLoop() {
    setInterval(() => {
        gameState.timeLeft--;

        if (gameState.timeLeft <= 0) {
            if (gameState.phase === 'betting') {
                // HẾT THỜI GIAN CƯỢC -> LẮC XÚC XẮC
                gameState.phase = 'result';
                gameState.timeLeft = 10;
                
                const d1 = Math.floor(Math.random() * 6) + 1;
                const d2 = Math.floor(Math.random() * 6) + 1;
                const d3 = Math.floor(Math.random() * 6) + 1;
                gameState.lastDices = [d1, d2, d3];
                
                const sum = d1 + d2 + d3;
                const resultType = sum >= 11 ? 'Tai' : 'Xiu';
                gameState.history.push(resultType === 'Tai' ? 1 : 0);
                if(gameState.history.length > 20) gameState.history.shift();

                console.log(`🎰 Kết quả: ${d1}-${d2}-${d3} (${sum}) -> ${resultType}`);
            } else {
                // HẾT THỜI GIAN TRẢ THƯỞNG -> VÁN MỚI
                gameState.phase = 'betting';
                gameState.timeLeft = 30;
                gameState.totalBetTai = 0;
                gameState.totalBetXiu = 0;
            }
        }

        // Gửi trạng thái game cho TẤT CẢ người chơi
        io.emit('gameUpdate', gameState);
    }, 1000);
}

// --- XỬ LÝ KẾT NỐI NGƯỜI CHƠI ---
io.on('connection', (socket) => {
    console.log('👤 Người chơi mới kết nối:', socket.id);
    
    // Gửi dữ liệu hiện tại ngay khi vừa vào
    socket.emit('gameUpdate', gameState);

    // Xử lý đặt cược
    socket.on('placeBet', (data) => {
        // data: { username, amount, type }
        if (gameState.phase !== 'betting') return;

        if (data.type === 'Tai') gameState.totalBetTai += data.amount;
        else gameState.totalBetXiu += data.amount;

        console.log(`💸 ${data.username} cược ${data.amount} vào ${data.type}`);
        io.emit('betUpdate', { tai: gameState.totalBetTai, xiu: gameState.totalBetXiu });
    });

    socket.on('disconnect', () => {
        console.log('❌ Người chơi ngắt kết nối');
    });
});

runGameLoop();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});
