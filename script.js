const socket = io();

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const multiplierDisplay = document.getElementById('multiplier');
const balanceDisplay = document.getElementById('balance');
const betInput = document.getElementById('bet-amount');
const playerNameInput = document.getElementById('player-name');
const autoCashoutInput = document.getElementById('auto-cashout');
const startBtn = document.getElementById('start-btn');
const cashoutBtn = document.getElementById('cashout-btn');
const betsListElement = document.getElementById('bets-list');
const activePlayersCount = document.getElementById('active-players-count');
const historyBar = document.getElementById('history-bar');

// Audio Elements
const flySound = document.getElementById('fly-sound');
const winSound = document.getElementById('win-sound');
const crashSound = document.getElementById('crash-sound');

canvas.width = 600;
canvas.height = 320;

const planeImg = new Image();
planeImg.src = 'https://cdn-icons-png.flaticon.com/512/3125/3125713.png';

let balance = 1000;
let autoCashoutValue = 0;
let currentMultiplier = 1.00;
let isGameRunning = false;
let xPos = 0;
let yPos = canvas.height;

// Update History Bar
socket.on('update_history', (history) => {
    historyBar.innerHTML = '';
    history.forEach(val => {
        const span = document.createElement('span');
        span.className = `history-tag ${parseFloat(val) >= 2.0 ? 'tag-high' : 'tag-low'}`;
        span.innerText = `${val}x`;
        historyBar.appendChild(span);
    });
});

// Update Bets List
socket.on('update_bets_list', (bets) => {
    betsListElement.innerHTML = '';
    activePlayersCount.innerText = bets.length;

    bets.forEach(bet => {
        const li = document.createElement('li');
        li.className = `bet-item ${bet.cashedOut ? 'cashed-out' : ''}`;
        if (bet.cashedOut) {
            li.innerHTML = `<span>${bet.username}</span><span style="color:#2ea44f;">+$${bet.winAmount} (@${bet.winMultiplier}x)</span>`;
        } else {
            li.innerHTML = `<span>${bet.username}</span><span style="color:#e55353;">$${bet.amount}</span>`;
        }
        betsListElement.appendChild(li);
    });
});

socket.on('multiplier_update', (data) => {
    currentMultiplier = parseFloat(data.multiplier);
    multiplierDisplay.innerText = currentMultiplier.toFixed(2) + 'x';

    if (!isNaN(autoCashoutValue) && autoCashoutValue > 1.00 && currentMultiplier >= autoCashoutValue && isGameRunning) {
        cashOut();
    }

    xPos += 2.5;
    yPos -= 1.2;
    drawTrajectory(xPos, yPos);
});

socket.on('game_started', () => {
    isGameRunning = true;
    xPos = 0;
    yPos = canvas.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    multiplierDisplay.style.color = "#ffffff";
    
    // Play Fly Sound
    flySound.currentTime = 0;
    flySound.play().catch(()=>{});
});

socket.on('game_crashed', (data) => {
    isGameRunning = false;
    flySound.pause();
    crashSound.play().catch(()=>{});

    multiplierDisplay.innerHTML = `CRASHED<br><span style="font-size:24px; color:#cf222e;">@${data.finalMultiplier}x</span>`;
    resetControls();
});

socket.on('cashout_success', (data) => {
    winSound.play().catch(()=>{});
    balance += data.winAmount;
    balanceDisplay.innerText = `$${balance}`;
    multiplierDisplay.innerHTML = `WON!<br><span style="font-size:24px; color:#2da44e;">+$${data.winAmount} (@${data.multiplier}x)</span>`;
});

function startGame() {
    const currentBet = parseFloat(betInput.value);
    autoCashoutValue = parseFloat(autoCashoutInput.value);
    const username = playerNameInput.value.trim() || 'Player';

    if (isNaN(currentBet) || currentBet <= 0 || currentBet > balance) {
        alert("ਸਹੀ ਬੈਟ ਰਕਮ ਭਰੋ!");
        return;
    }

    balance -= currentBet;
    balanceDisplay.innerText = `$${balance}`;

    socket.emit('place_bet', { username: username, amount: currentBet });

    startBtn.disabled = true;
    betInput.disabled = true;
    cashoutBtn.disabled = false;
}

function cashOut() {
    if (!isGameRunning) return;
    socket.emit('cash_out');
    cashoutBtn.disabled = true;
}

function resetControls() {
    startBtn.disabled = false;
    betInput.disabled = false;
    cashoutBtn.disabled = true;
}

function drawTrajectory(x, y) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#e55353';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-25 * Math.PI / 180);
    if (planeImg.complete) {
        ctx.drawImage(planeImg, -18, -18, 36, 36);
    }
    ctx.restore();
}