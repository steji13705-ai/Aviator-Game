const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*" },
    transports: ['websocket', 'polling']
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// MongoDB Connection
const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aviatorGame';

mongoose.connect(mongoURI)
    .then(() => console.log('✅ MongoDB Connected Successfully'))
    .catch(err => console.log('❌ MongoDB Error:', err));

// Game State Variables
let multiplier = 1.00;
let isGameRunning = false;
let activeBets = {}; // Active bets track ਕਰਨ ਲਈ

function startGameLoop() {
    if (isGameRunning) return;
    isGameRunning = true;
    multiplier = 1.00;
    activeBets = {}; // Reset bets for new round

    const crashPoint = (Math.random() * 4 + 1.2).toFixed(2);
    console.log(`🚀 Round Started! Crash at: ${crashPoint}x`);

    const interval = setInterval(() => {
        multiplier = parseFloat((multiplier + 0.01).toFixed(2));
        io.emit('updateMultiplier', multiplier.toFixed(2));

        if (multiplier >= crashPoint) {
            clearInterval(interval);
            io.emit('gameCrashed', multiplier.toFixed(2));
            console.log(`💥 Crashed at: ${multiplier}x`);
            isGameRunning = false;

            setTimeout(startGameLoop, 3000);
        }
    }, 100);
}

io.on('connection', (socket) => {
    console.log('⚡ Client Connected:', socket.id);

    if (!isGameRunning) {
        startGameLoop();
    }

    // Bet Handle ਕਰੋ
    socket.on('placeBet', (data) => {
        activeBets[socket.id] = {
            amount: data.amount,
            cashedOut: false
        };
        console.log(`💰 Bet placed by ${socket.id}: $${data.amount}`);
        socket.emit('betConfirmed', { amount: data.amount });
    });

    // Cash Out Handle ਕਰੋ
    socket.on('cashOut', () => {
        if (activeBets[socket.id] && !activeBets[socket.id].cashedOut && isGameRunning) {
            activeBets[socket.id].cashedOut = true;
            const winAmount = (activeBets[socket.id].amount * multiplier).toFixed(2);
            
            console.log(`🎉 Cashout by ${socket.id} at ${multiplier}x! Win: $${winAmount}`);
            
            socket.emit('cashOutSuccess', {
                multiplier: multiplier.toFixed(2),
                winAmount: winAmount
            });
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    startGameLoop();
});
