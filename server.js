const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const session = require('express-session');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// MongoDB Connection (Cloud Atlas + Local Fallback)
const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aviatorGame';

mongoose.connect(mongoURI)
    .then(() => console.log('✅ MongoDB Connected Successfully'))
    .catch(err => console.log('❌ MongoDB Error:', err));

// User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    balance: { type: Number, default: 1000 }
});

const User = mongoose.model('User', userSchema);

// Auth Routes
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();
        res.json({ success: true, message: "ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਸਫ਼ਲ ਰਹੀ!" });
    } catch (err) {
        res.json({ success: false, message: "ਯੂਜ਼ਰਨੇਮ ਪਹਿਲਾਂ ਤੋਂ ਮੌਜੂਦ ਹੈ!" });
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (user && await bcrypt.compare(password, user.password)) {
        res.json({ success: true, username: user.username, balance: user.balance });
    } else {
        res.json({ success: false, message: "ਗਲਤ ਯੂਜ਼ਰਨੇਮ ਜਾਂ ਪਾਸਵਰਡ!" });
    }
});

// Server Game Logic
let currentMultiplier = 1.00;
let crashPoint = 1.00;
let isGameRunning = false;
let activeBets = [];
let multiplierHistory = [];

io.on('connection', (socket) => {
    socket.emit('update_history', multiplierHistory);
    socket.emit('update_bets_list', activeBets);

    socket.on('place_bet', async (data) => {
        const user = await User.findOne({ username: data.username });
        if (user && user.balance >= data.amount) {
            user.balance -= data.amount;
            await user.save();

            activeBets.push({
                id: socket.id,
                username: data.username,
                amount: data.amount,
                cashedOut: false,
                winAmount: 0
            });

            io.emit('update_bets_list', activeBets);
            socket.emit('balance_updated', user.balance);

            if (!isGameRunning) startRound();
        }
    });

    socket.on('cash_out', async (data) => {
        const bet = activeBets.find(b => b.id === socket.id && !b.cashedOut);
        if (bet && isGameRunning) {
            bet.cashedOut = true;
            bet.winAmount = Math.floor(bet.amount * currentMultiplier);

            const user = await User.findOne({ username: bet.username });
            if (user) {
                user.balance += bet.winAmount;
                await user.save();
                socket.emit('balance_updated', user.balance);
            }

            io.emit('update_bets_list', activeBets);
            socket.emit('cashout_success', { winAmount: bet.winAmount, multiplier: currentMultiplier.toFixed(2) });
        }
    });
});

function startRound() {
    isGameRunning = true;
    currentMultiplier = 1.00;
    crashPoint = (Math.random() * 5 + 1.05).toFixed(2);
    io.emit('game_started');

    const interval = setInterval(() => {
        if (currentMultiplier >= crashPoint) {
            clearInterval(interval);
            isGameRunning = false;
            multiplierHistory.unshift(currentMultiplier.toFixed(2));
            if (multiplierHistory.length > 10) multiplierHistory.pop();

            io.emit('game_crashed', { finalMultiplier: currentMultiplier.toFixed(2) });
            io.emit('update_history', multiplierHistory);
            setTimeout(() => { activeBets = []; io.emit('update_bets_list', activeBets); }, 3000);
            return;
        }
        currentMultiplier += 0.02;
        io.emit('multiplier_update', { multiplier: currentMultiplier.toFixed(2) });
    }, 50);
}

server.listen(3000, () => console.log('🚀 Server running on http://localhost:3000'));
