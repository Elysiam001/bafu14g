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

// Schema Người dùng
const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    balance: { type: Number, default: 0 },
    diamond: { type: Number, default: 0 },
    email: String,
    status: { type: String, default: 'Active' },
    joinedDate: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// Schema Đơn nạp/rút
const depositSchema = new mongoose.Schema({
    user: String,
    amount: Number,
    memo: String,
    status: { type: String, default: 'Pending' },
    createdAt: { type: Date, default: Date.now }
});
const Deposit = mongoose.model('Deposit', depositSchema);

// Trạng thái Game
let gameState = {
    timeLeft: 30,
    phase: 'betting', // betting, result
    lastDices: [1, 1, 1],
    totalBetTai: 0,
    totalBetXiu: 0,
    history: [],
    bets: [] // Lưu trữ các cược trong phiên: { username, amount, type, socketId }
};

// Vòng lặp Game
function runGameLoop() {
    setInterval(async () => {
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
                const winningSide = sum >= 11 ? 'Tai' : 'Xiu';
                gameState.history.push({ dices: gameState.lastDices, result: winningSide });
                if (gameState.history.length > 20) gameState.history.shift();

                console.log(`Kết quả: ${gameState.lastDices.join(', ')} - ${winningSide}`);

                // --- XỬ LÝ TRẢ THƯỞNG ---
                for (const bet of gameState.bets) {
                    try {
                        if (bet.type === winningSide) {
                            const winAmount = bet.amount * 1.95; // Trả thưởng x1.95 (trừ phế)
                            const updatedUser = await User.findOneAndUpdate(
                                { username: bet.username },
                                { $inc: { balance: winAmount } },
                                { new: true }
                            );
                            if (updatedUser) {
                                io.to(bet.socketId).emit('balanceUpdate', { balance: updatedUser.balance });
                                io.to(bet.socketId).emit('betResult', { win: true, amount: winAmount });
                            }
                        } else {
                            io.to(bet.socketId).emit('betResult', { win: false, amount: bet.amount });
                        }
                    } catch (err) {
                        console.error('Lỗi trả thưởng:', err);
                    }
                }
            } else {
                // Hết thời gian chờ, quay lại đặt cược
                gameState.phase = 'betting';
                gameState.timeLeft = 30;
                gameState.totalBetTai = 0;
                gameState.totalBetXiu = 0;
                gameState.bets = []; // Reset danh sách cược
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

    // Lấy thông tin người dùng khi họ vào game
    socket.on('getUserInfo', async (username) => {
        try {
            let user = await User.findOne({ username });
            if (!user) {
                // Tự động tạo user demo nếu chưa có (cho người dùng thử nghiệm)
                user = await User.create({ 
                    username: username, 
                    balance: 10000000, // Cho 10 triệu trải nghiệm
                    email: username + '@gmail.com'
                });
            }
            socket.emit('balanceUpdate', { balance: user.balance, diamond: user.diamond });
        } catch (err) {
            console.error('Lỗi lấy user:', err);
        }
    });

    socket.on('placeBet', async (data) => {
        if (gameState.phase !== 'betting') return;
        
        try {
            const user = await User.findOne({ username: data.username });
            if (!user) return socket.emit('errorMsg', 'Người dùng không tồn tại!');
            if (user.balance < data.amount) return socket.emit('errorMsg', 'Số dư không đủ!');

            // Trừ tiền ngay khi cược
            user.balance -= data.amount;
            await user.save();

            // Lưu cược vào game state
            gameState.bets.push({
                username: data.username,
                amount: data.amount,
                type: data.type,
                socketId: socket.id
            });

            if (data.type === 'Tai') {
                gameState.totalBetTai += data.amount;
            } else {
                gameState.totalBetXiu += data.amount;
            }
            
            // Cập nhật lại số dư cho người chơi
            socket.emit('balanceUpdate', { balance: user.balance });
            // Cập nhật tổng cược cho mọi người
            io.emit('gameUpdate', gameState);
        } catch (err) {
            console.error('Lỗi đặt cược:', err);
            socket.emit('errorMsg', 'Đã xảy ra lỗi khi đặt cược!');
        }
    });

    socket.on('disconnect', () => {
        console.log('Người chơi ngắt kết nối:', socket.id);
    });

    // --- XỬ LÝ NẠP TIỀN ---
    socket.on('createDeposit', async (data) => {
        try {
            const newDep = await Deposit.create({
                user: data.username,
                amount: data.amount,
                memo: data.memo
            });
            console.log(`Đơn nạp mới: ${data.username} - ${data.amount}`);
            // Gửi cho admin nếu admin đang online (phát toàn bộ cho đơn giản)
            io.emit('newDepositNotification', newDep);
        } catch (err) {
            console.error('Lỗi tạo đơn nạp:', err);
        }
    });

    socket.on('approveDeposit', async (depositId) => {
        try {
            const dep = await Deposit.findById(depositId);
            if (dep && dep.status === 'Pending') {
                dep.status = 'Approved';
                await dep.save();

                const updatedUser = await User.findOneAndUpdate(
                    { username: dep.user },
                    { $inc: { balance: dep.amount } },
                    { new: true }
                );

                console.log(`Đã duyệt đơn nạp: ${dep.user} +${dep.amount}`);
                
                // Nếu user đang online, gửi cập nhật số dư
                io.emit('balanceUpdateNotification', {
                    username: dep.user,
                    balance: updatedUser.balance
                });
                
                // Cập nhật lại danh sách cho admin
                io.emit('depositStatusUpdated', dep);
            }
        } catch (err) {
            console.error('Lỗi duyệt nạp:', err);
        }
    });

    socket.on('getPendingDeposits', async () => {
        const deps = await Deposit.find({ status: 'Pending' }).sort({ createdAt: -1 });
        socket.emit('receivePendingDeposits', deps);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});
