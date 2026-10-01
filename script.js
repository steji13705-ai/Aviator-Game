// Connect Socket.io to Live Server Automatically
const socket = io({
    transports: ['websocket', 'polling']
});

// Balance & Betting Variables
let userBalance = 1000;
let currentBet = 0;
let isBetPlaced = false;

// Socket Connection Status
socket.on('connect', () => {
    console.log('✅ Connected to Game Server via Socket');
});

// Real-time Multiplier Update from Server
socket.on('updateMultiplier', (multiplier) => {
    // 1. ਲੱਭੋ ਕਿ ਸਕ੍ਰੀਨ 'ਤੇ 1.00x ਕਿੱਥੇ ਲਿਖਿਆ ਹੈ
    const allH1 = document.querySelectorAll('h1');
    const allDivs = document.querySelectorAll('div');
    
    let targetElement = null;

    // ਚੈੱਕ ਕਰੋ ਕਿ ਕਿਹੜੀ ਜਗ੍ਹਾ 'x' ਲਿਖਿਆ ਆ ਰਿਹਾ ਹੈ
    allH1.forEach(el => {
        if (el.innerText.includes('x')) targetElement = el;
    });

    if (!targetElement) {
        allDivs.forEach(el => {
            if (el.children.length === 0 && el.innerText.includes('x')) {
                targetElement = el;
            }
        });
    }

    // 2. ਮਲਟੀਪਲਾਇਰ ਅੱਪਡੇਟ ਕਰੋ
    if (targetElement) {
        targetElement.innerText = multiplier + 'x';
        targetElement.style.color = '#ffffff';
    }
});

// Game Crash Event from Server
socket.on('gameCrashed', (finalMultiplier) => {
    const allH1 = document.querySelectorAll('h1');
    allH1.forEach(el => {
        if (el.innerText.includes('x')) {
            el.innerText = 'CRASHED AT ' + finalMultiplier + 'x';
            el.style.color = '#ff4d4d';
        }
    });
    isBetPlaced = false;
});

// Fix for inline onclick="startGame()" in index.html
function startGame() {
    const betInput = document.querySelector('input[type="number"]') || document.querySelectorAll('input')[0];
    const amount = parseFloat(betInput ? betInput.value : 10);
    
    if (amount > 0 && amount <= userBalance) {
        currentBet = amount;
        userBalance -= amount;
        isBetPlaced = true;
        console.log(`Bet placed: $${amount}`);
        
        socket.emit('placeBet', { amount });
    } else {
        alert('ਕਿਰਪਾ ਕਰਕੇ ਸਹੀ ਬੈੱਟ ਰਕਮ ਭਰੋ!');
    }
}

// Fix for inline onclick="cashOut()" in index.html
function cashOut() {
    if (isBetPlaced) {
        socket.emit('cashOut');
        isBetPlaced = false;
        console.log('Cashed out successfully!');
    }
}
