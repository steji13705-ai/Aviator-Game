// Connect Socket.io to Live Server Automatically
const socket = io({
    transports: ['websocket', 'polling']
});

// Balance & Betting Variables
let userBalance = 971; // Default balance, dynamically loaded if updated
let currentBet = 0;
let isBetPlaced = false;

// UI Elements Selection
const multiplierText = document.querySelector('.main-card h1') || document.querySelector('h1');
const balanceDisplay = document.querySelector('.main-card span, #balance') || document.body;
const betInput = document.querySelector('input[type="number"]') || document.querySelectorAll('input')[1];
const betBtn = document.querySelector('.btn-success, #betBtn') || document.querySelector('button');
const cashOutBtn = document.querySelector('.btn-danger, #cashOutBtn') || document.querySelectorAll('button')[1];

// Socket Connection Status
socket.on('connect', () => {
    console.log('✅ Connected to Game Server via Socket');
});

// Real-time Multiplier Update from Server
socket.on('updateMultiplier', (multiplier) => {
    if (multiplierText) {
        multiplierText.innerText = multiplier + 'x';
        multiplierText.style.color = '#ffffff';
    }
});

// Game Crash Event from Server
socket.on('gameCrashed', (finalMultiplier) => {
    if (multiplierText) {
        multiplierText.innerText = 'CRASHED AT ' + finalMultiplier + 'x';
        multiplierText.style.color = '#ff4d4d';
    }
    
    // Reset state for next round
    isBetPlaced = false;
});

// Optional: Bet Placement Event Handler
if (betBtn) {
    betBtn.addEventListener('click', () => {
        const amount = parseFloat(betInput ? betInput.value : 0);
        if (amount > 0 && amount <= userBalance) {
            currentBet = amount;
            userBalance -= amount;
            isBetPlaced = true;
            console.log(`Bet placed: $${amount}`);
            
            socket.emit('placeBet', { amount });
        } else {
            alert('ਕਿਰਪਾ ਕਰਕੇ ਸਹੀ ਬੈੱਟ ਰਕਮ ਭਰੋ!');
        }
    });
}

// Optional: Cash Out Event Handler
if (cashOutBtn) {
    cashOutBtn.addEventListener('click', () => {
        if (isBetPlaced) {
            socket.emit('cashOut');
            isBetPlaced = false;
            console.log('Cashed out successfully!');
        }
    });
}
