const socket = io({
    transports: ['websocket', 'polling']
});

let userBalance = 1000;
let currentBet = 0;
let isBetPlaced = false;

const balanceDisplay = document.querySelector('.main-card span, #balance') || document.body;

function updateBalanceUI() {
    const balanceElem = document.querySelector('span') || document.getElementById('balance');
    if (balanceElem && balanceElem.innerText.includes('Balance')) {
        balanceElem.innerText = `Balance: $${userBalance.toFixed(2)}`;
    }
}

socket.on('connect', () => {
    console.log('✅ Connected to Game Server via Socket');
});

socket.on('updateMultiplier', (multiplier) => {
    const allH1 = document.querySelectorAll('h1');
    allH1.forEach(el => {
        if (el.innerText.includes('x') || !isNaN(parseFloat(el.innerText))) {
            el.innerText = multiplier + 'x';
            el.style.color = '#ffffff';
        }
    });
});

socket.on('gameCrashed', (finalMultiplier) => {
    const allH1 = document.querySelectorAll('h1');
    allH1.forEach(el => {
        el.innerText = 'CRASHED AT ' + finalMultiplier + 'x';
        el.style.color = '#ff4d4d';
    });
    isBetPlaced = false;
});

// Bet Confirm ਹੋਣ ਤੇ
socket.on('betConfirmed', (data) => {
    console.log('✅ Bet successfully registered on server');
});

// Cash Out Success ਹੋਣ ਤੇ Balance ਵਧਾਓ
socket.on('cashOutSuccess', (data) => {
    userBalance += parseFloat(data.winAmount);
    updateBalanceUI();
    alert(`🎉 ਜਿੱਤ ਗਏ! ਤੁਸੀਂ $${data.winAmount} ਜਿੱਤੇ (${data.multiplier}x 'ਤੇ)!`);
    isBetPlaced = false;
});

function startGame() {
    const betInput = document.querySelector('input[type="number"]') || document.querySelectorAll('input')[0];
    const amount = parseFloat(betInput ? betInput.value : 10);

    if (amount > 0 && amount <= userBalance) {
        currentBet = amount;
        userBalance -= amount;
        updateBalanceUI();
        isBetPlaced = true;

        socket.emit('placeBet', { amount });
        console.log(`Bet sent to server: $${amount}`);
    } else {
        alert('ਕਿਰਪਾ ਕਰਕੇ ਸਹੀ ਬੈੱਟ ਰਕਮ ਭਰੋ!');
    }
}

function cashOut() {
    if (isBetPlaced) {
        socket.emit('cashOut');
        console.log('Cashout request sent to server');
    } else {
        alert('ਪਹਿਲਾਂ ਬੈੱਟ ਲਗਾਓ!');
    }
}
