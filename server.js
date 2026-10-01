const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const session = require('express-session');

const app = express();
const server = http.createServer(app);

// Socket.io Config with Transports
const io = new Server(server, {
    cors: { origin: "*" },
    transports: ['websocket', 'polling']
});

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

// Game Loop Logic
let multiplier = 1.00;
let isGameRunning = false;

function startGameLoop() {
    if (isGameRunning) return;
    isGameRunning = true;
    multiplier = 1.00;

    const crashPoint = (Math.random() * 4 + 1.2).toFixed(2); // Random Crash Point between 1.2x and 5.2x

    const interval = setInterval(() => {
        multiplier += 0.01;
        io.emit('updateMultiplier', multiplier.toFixed(2));

        if (multiplier >= crashPoint) {
            clearInterval(interval);
            io.emit('gameCrashed', multiplier.toFixed(2));
            isGameRunning = false;

            // Restart game after 3 seconds
            setTimeout(startGameLoop, 3000);
        }
    }, 100);
}

io.on('connection', (socket) => {
    console.log('⚡ New Client Connected:', socket.id);
    
    // Send current multiplier state to new user
    socket.emit('updateMultiplier', multiplier.toFixed(2));

    // Start game loop if not running
    if (!isGameRunning) {
        startGameLoop();
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
