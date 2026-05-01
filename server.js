const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, './'))); 

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Kết nối MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/taixiu')
    .then(() => console.log('✅ Đã kết nối MongoDB'))
    .catch(err => console.error('❌ Lỗi kết nối MongoDB:', err));

// Trạng thái Game
let gameState = {
    timeLeft: 30,
    phase: 'betting', // betting, result
    lastDices: [1, 1, 1],
    totalBetTai: 0,
    totalBetXiu: 0,
    history: []
};

// Vòng lặp Game
function runGameLoop() {
    setInterval(() => {
        gameState.timeLeft--;

        if (gameState.timeLeft <= 0) {
            if (gameState.phase === 'betting') {
                // Hết thời gian cược, chuyển sang trả kết quả
                gameState.phase = 'result';
                gameState.timeLeft = 10;
                
                // Lắc xúc xắc ngẫu nhiên
                gameState.lastDices = [
                    Math.floor(Math.random() * 6) + 1,
                    Math.floor(Math.random() * 6) + 1,
                    Math.floor(Math.random() * 6) + 1
                ];
                
                const sum = gameState.lastDices.reduce((a, b) => a + b, 0);
                const result = sum >= 11 ? 'Tai' : 'Xiu';
                gameState.history.push({ dices: gameState.lastDices, result });
                if (gameState.history.length > 20) gameState.history.shift();

                console.log(`Kết quả: ${gameState.lastDices.join(', ')} - ${result}`);
            } else {
                // Hết thời gian chờ, quay lại đặt cược
                gameState.phase = 'betting';
                gameState.timeLeft = 30;
                gameState.totalBetTai = 0;
                gameState.totalBetXiu = 0;
            }
        }

        // Gửi trạng thái mới nhất cho tất cả người chơi
        io.emit('gameUpdate', gameState);
    }, 1000);
}

runGameLoop();

io.on('connection', (socket) => {
    console.log('Một người chơi đã kết nối:', socket.id);
    
    // Gửi trạng thái hiện tại cho người mới vào
    socket.emit('gameUpdate', gameState);

    socket.on('placeBet', (data) => {
        if (gameState.phase !== 'betting') return;
        
        if (data.type === 'Tai') {
            gameState.totalBetTai += data.amount;
        } else {
            gameState.totalBetXiu += data.amount;
        }
        
        // Cập nhật cho mọi người
        io.emit('gameUpdate', gameState);
    });

    socket.on('disconnect', () => {
        console.log('Người chơi ngắt kết nối:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});
