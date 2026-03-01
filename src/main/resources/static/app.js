// App State
let gameState = null;
let targetScore = 50;
let difficultyLevel = 3;
let timerInterval = null;
let timeRemaining = 60.0;
const TURN_DURATION = 60.0; // 60 seconds per round
let selectedCpuName = 'Adam';

// DOM Elements
const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const gameOverScreen = document.getElementById('game-over-screen');

// Start Settings
const scoreBtns = document.querySelectorAll('.score-options:not(#cpu-options) .score-btn');
const difficultySlider = document.getElementById('difficulty-slider');
const difficultyValue = document.getElementById('difficulty-value');
const startBtn = document.getElementById('start-btn');

// Game HUD
const humanScoreEl = document.getElementById('human-score');
const cpuScoreEl = document.getElementById('cpu-score');
const humanScoreBar = document.getElementById('human-score-bar');
const cpuScoreBar = document.getElementById('cpu-score-bar');
const cpuLevelDisplay = document.getElementById('cpu-level-display');
const chatArea = document.getElementById('chat-area');
const typingIndicator = document.getElementById('typing-indicator');

// CPU Options
const cpuOptionsBtns = document.querySelectorAll('#cpu-options .score-btn');
const cpuNameDisplay = document.getElementById('cpu-name-display');
const typingCpuName = document.getElementById('typing-cpu-name');
const finalCpuName = document.getElementById('final-cpu-name');

// Input Area
const requiredLetterEl = document.getElementById('required-letter');
const wordInput = document.getElementById('word-input');
const submitBtn = document.getElementById('submit-btn');
const timerBar = document.getElementById('timer-bar');
const errorMsg = document.getElementById('error-msg');

// Game Over Data
const gameOverTitle = document.getElementById('game-over-title');
const finalHumanScore = document.getElementById('final-human-score');
const finalCpuScore = document.getElementById('final-cpu-score');
const restartBtn = document.getElementById('restart-btn');
const homeBtn = document.getElementById('home-btn');

// --- Initialization ---

scoreBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        scoreBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        targetScore = parseInt(btn.dataset.score);
    });
});

cpuOptionsBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        cpuOptionsBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedCpuName = btn.dataset.cpu;
    });
});

difficultySlider.addEventListener('input', (e) => {
    difficultyLevel = e.target.value;
    difficultyValue.textContent = difficultyLevel;
});

startBtn.addEventListener('click', async () => {
    startBtn.disabled = true;
    startBtn.textContent = 'STARTING...';
    try {
        const response = await fetch(`/api/game/start?difficulty=${difficultyLevel}&targetScore=${targetScore}&cpuName=${selectedCpuName}`, { method: 'POST' });
        gameState = await response.json();

        cpuLevelDisplay.textContent = difficultyLevel;
        resetGameUI();
        updateGameUI(gameState);

        showScreen(gameScreen);

        // Instead of enabling input, we let the CPU take the first turn
        simulateCpuTurn();
    } catch (e) {
        console.error('Error starting game:', e);
        alert('Failed to start game. Is the server running?');
    } finally {
        startBtn.disabled = false;
        startBtn.textContent = 'START BATTLE';
    }
});

restartBtn.addEventListener('click', () => {
    showScreen(startScreen);
});

homeBtn.addEventListener('click', () => {
    if (confirm('Quit the current game and return to home?')) {
        clearInterval(timerInterval);
        gameState = null;
        showScreen(startScreen);
    }
});

// --- Gameplay ---

wordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleSubmitMove();
    }
});

submitBtn.addEventListener('click', handleSubmitMove);

wordInput.addEventListener('input', () => {
    const val = wordInput.value.toLowerCase().replace(/[^a-z]/g, '');
    wordInput.value = val;
    errorMsg.textContent = '';

    // Auto color required letter if user types it
    if (gameState && val.length > 0) {
        if (val.charAt(0) === gameState.requiredStartingLetter) {
            requiredLetterEl.style.backgroundColor = '#06d6a0'; // green validation
            requiredLetterEl.style.color = '#fff';
        } else {
            requiredLetterEl.style.backgroundColor = '#ef476f'; // red error
            requiredLetterEl.style.color = '#fff';
        }
    } else {
        requiredLetterEl.style.backgroundColor = '#fff';
        requiredLetterEl.style.color = '#1a1a2e';
    }
});

async function handleSubmitMove() {
    const word = wordInput.value.trim();
    if (!word) return;

    disableInput();
    errorMsg.textContent = '';

    try {
        const response = await fetch(`/api/game/playHuman?gameId=${gameState.id}&word=${word}`, { method: 'POST' });
        const result = await response.json();

        if (!result.valid) {
            errorMsg.textContent = result.message;
            enableInput();
            return;
        }

        // Valid human move
        appendChatBubble('human', result.humanWord, result.humanWordScore);
        gameState = result.gameState;
        updateGameUI(gameState);

        if (gameState.gameOver) {
            handleGameOver();
            return;
        }

        // Trigger the CPU turn asynchronously
        simulateCpuTurn();

    } catch (e) {
        console.error('Error playing turn:', e);
        errorMsg.textContent = 'Network error.';
        enableInput();
    }
}

async function simulateCpuTurn() {
    // Show typing
    typingIndicator.classList.remove('hidden');
    chatArea.scrollTop = chatArea.scrollHeight;

    // CPU thinks for 0.5s to 1.5s based on level
    const delay = Math.random() * 1000 + 500;

    try {
        const response = await fetch(`/api/game/playCpu?gameId=${gameState.id}`, { method: 'POST' });
        const turnResult = await response.json();

        setTimeout(() => {
            typingIndicator.classList.add('hidden');

            if (turnResult.cpuWord === "SKIPPED!") {
                appendChatBubble('cpu', "SKIPPED!", 0);
            } else {
                appendChatBubble('cpu', turnResult.cpuWord, turnResult.cpuWordScore);
            }

            gameState = turnResult.gameState;
            updateGameUI(gameState);

            if (gameState.gameOver) {
                handleGameOver();
            } else {
                enableInput();
            }
        }, delay);
    } catch (e) {
        console.error('Error during CPU turn:', e);
        typingIndicator.classList.add('hidden');
        errorMsg.textContent = 'Network error during CPU turn.';
        enableInput();
    }
}

// --- Game Loop / Timer ---

function startTimer() {
    timeRemaining = TURN_DURATION;
    clearInterval(timerInterval);
    timerBar.classList.remove('warning', 'danger');

    timerInterval = setInterval(() => {
        timeRemaining -= 0.1;
        updateTimerBar();

        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            timeRemaining = 0;
            updateTimerBar();
            handleTimeout();
        }
    }, 100);
}

function stopTimer() {
    clearInterval(timerInterval);
    timerBar.style.width = '100%';
    timerBar.style.backgroundColor = '#1a1a2e'; // hide instantly when stopped
}

function updateTimerBar() {
    const percent = Math.max(0, (timeRemaining / TURN_DURATION) * 100);
    timerBar.style.width = `${percent}%`;

    if (percent < 50 && percent >= 25) {
        timerBar.className = 'timer-bar warning';
    } else if (percent < 25) {
        timerBar.className = 'timer-bar danger';
    } else {
        timerBar.className = 'timer-bar';
    }
}

async function handleTimeout() {
    disableInput();
    try {
        const response = await fetch(`/api/game/timeout?gameId=${gameState.id}`, { method: 'POST' });
        gameState = await response.json();

        // Human forfeited turn
        appendChatBubble('human', "SKIPPED!", 0);
        updateGameUI(gameState);

        if (gameState.gameOver) {
            handleGameOver();
        } else {
            simulateCpuTurn();
        }
    } catch (e) {
        console.error('Error timing out:', e);
        enableInput();
    }
}

// --- UI Updates ---

function disableInput() {
    stopTimer();
    wordInput.disabled = true;
    submitBtn.disabled = true;
}

function enableInput() {
    wordInput.disabled = false;
    submitBtn.disabled = false;
    wordInput.value = '';
    wordInput.focus();
    requiredLetterEl.style.backgroundColor = '#fff';
    requiredLetterEl.style.color = '#1a1a2e';
    startTimer();
}

function updateGameUI(state) {
    if (!state) return;

    humanScoreEl.textContent = state.humanScore;
    cpuScoreEl.textContent = state.cpuScore;

    const humanPct = Math.min(100, (state.humanScore / state.targetScore) * 100);
    const cpuPct = Math.min(100, (state.cpuScore / state.targetScore) * 100);

    humanScoreBar.style.width = `${humanPct}%`;
    cpuScoreBar.style.width = `${cpuPct}%`;

    if (state.requiredStartingLetter) {
        requiredLetterEl.textContent = state.requiredStartingLetter.toUpperCase();
    } else {
        requiredLetterEl.textContent = '?';
    }
}

function appendChatBubble(player, word, score) {
    const chatPlace = document.querySelector('.chat-placeholder');
    if (chatPlace) chatPlace.remove();

    const container = document.createElement('div');
    container.className = `chat-bubble-container ${player}`;

    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';

    const wordSpan = document.createElement('span');
    wordSpan.className = 'word-text';
    // Highlight the required letter dynamically
    const firstLetter = word.charAt(0).toUpperCase();
    const rest = word.substring(1);
    wordSpan.innerHTML = `<u>${firstLetter}</u>${rest}`;

    const scoreSpan = document.createElement('span');
    scoreSpan.className = 'word-score';
    scoreSpan.textContent = `+${score}`;

    if (player === 'human') {
        bubble.appendChild(wordSpan);
        bubble.appendChild(scoreSpan);
    } else {
        bubble.appendChild(scoreSpan);
        bubble.appendChild(wordSpan);
    }

    container.appendChild(bubble);
    chatArea.appendChild(container);

    // Scroll to bottom
    chatArea.scrollTop = chatArea.scrollHeight;
}

function resetGameUI() {
    cpuNameDisplay.textContent = gameState.cpuName;
    typingCpuName.textContent = gameState.cpuName;
    finalCpuName.textContent = gameState.cpuName;
    chatArea.innerHTML = `<div class="chat-placeholder">Game Started! ${gameState.cpuName} is making the first move...</div>`;
    humanScoreBar.style.width = '0%';
    cpuScoreBar.style.width = '0%';
    errorMsg.textContent = '';
    requiredLetterEl.style.backgroundColor = '#fff';
    requiredLetterEl.style.color = '#1a1a2e';
}

function handleGameOver() {
    disableInput();

    finalHumanScore.textContent = gameState.humanScore;
    finalCpuScore.textContent = gameState.cpuScore;

    if (gameState.winner === 'HUMAN') {
        gameOverTitle.textContent = 'YOU WIN!';
        gameOverTitle.style.color = '#06d6a0'; // win green
    } else {
        gameOverTitle.textContent = 'YOU LOSE...';
        gameOverTitle.style.color = '#ef476f'; // lose red
    }

    const gameOverSubtitle = document.getElementById('game-over-subtitle');
    if (gameState.humanScore >= gameState.targetScore || gameState.cpuScore >= gameState.targetScore) {
        gameOverSubtitle.textContent = 'Target score reached.';
    } else {
        gameOverSubtitle.textContent = 'Time is up! Turn forfeited.';
    }

    setTimeout(() => {
        showScreen(gameOverScreen);
    }, 1500); // Wait bit before showing game over screen so user sees final state
}

function showScreen(screenEl) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    screenEl.classList.remove('hidden');
}
