const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);

// Socket.io Setup
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

function startGameLoop() {
    if (isGameRunning) return;
    isGameRunning = true;
    multiplier = 1.00;

    // Random Crash Point
    const crashPoint = (Math.random() * 4 + 1.2).toFixed(2);
    console.log(`🚀 New Round Started! Crash Point: ${crashPoint}x`);

    const interval = setInterval(() => {
        multiplier = parseFloat((multiplier + 0.01).toFixed(2));
        
        // Broadcast multiplier to ALL clients
        io.emit('updateMultiplier', multiplier.toFixed(2));

        if (multiplier >= crashPoint) {
            clearInterval(interval);
            io.emit('gameCrashed', multiplier.toFixed(2));
            console.log(`💥 Crashed at: ${multiplier}x`);
            isGameRunning = false;

            // Wait 3 seconds and start new round
            setTimeout(startGameLoop, 3000);
        }
    }, 100);
}

// Socket Connection Logic
io.on('connection', (socket) => {
    console.log('⚡ New Client Connected:', socket.id);
    
    // Immediately start loop on first connection if not already running
    if (!isGameRunning) {
        startGameLoop();
    }

    socket.on('placeBet', (data) => {
        console.log(`Bet received from ${socket.id}:`, data);
    });

    socket.on('cashOut', () => {
        console.log(`Cashout received from ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    // Auto start game loop when server boots up
    startGameLoop();
});
