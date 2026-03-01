// ============================================================
// APP STATE
// ============================================================
let gameState = null;
let selectedBotName = null;
let selectedLevelIndex = null;
let timerInterval = null;
let timeRemaining = 60.0;
const TURN_DURATION = 60.0;

// ============================================================
// SCREEN REFERENCES
// ============================================================
const homeScreen = document.getElementById('home-screen');
const botScreen = document.getElementById('bot-screen');
const gameScreen = document.getElementById('game-screen');
const gameOverScreen = document.getElementById('game-over-screen');

// Home
const playBtn = document.getElementById('play-btn');

// Bot Selection
const botCardsEl = document.getElementById('bot-cards');
const backToHomeBtn = document.getElementById('back-to-home-btn');

// Game HUD
const humanScoreEl = document.getElementById('human-score');
const cpuScoreEl = document.getElementById('cpu-score');
const humanScoreBar = document.getElementById('human-score-bar');
const cpuScoreBar = document.getElementById('cpu-score-bar');
const chatArea = document.getElementById('chat-area');
const typingIndicator = document.getElementById('typing-indicator');
const cpuNameDisplay = document.getElementById('cpu-name-display');
const typingCpuName = document.getElementById('typing-cpu-name');
const gimmickBanner = document.getElementById('gimmick-banner');

// Input Area
const requiredLetterEl = document.getElementById('required-letter');
const wordInput = document.getElementById('word-input');
const submitBtn = document.getElementById('submit-btn');
const timerBar = document.getElementById('timer-bar');
const errorMsg = document.getElementById('error-msg');

// Game Over
const gameOverTitle = document.getElementById('game-over-title');
const finalHumanScore = document.getElementById('final-human-score');
const finalCpuScore = document.getElementById('final-cpu-score');
const finalCpuName = document.getElementById('final-cpu-name');
const restartBtn = document.getElementById('restart-btn');
const homeBtn = document.getElementById('home-btn');

// ============================================================
// SCREEN NAVIGATION
// ============================================================

function showScreen(screenEl) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    screenEl.classList.remove('hidden');
}

playBtn.addEventListener('click', () => showScreen(botScreen));
backToHomeBtn.addEventListener('click', () => showScreen(homeScreen));
restartBtn.addEventListener('click', () => showScreen(botScreen));

// Quit — immediate, no dialog
homeBtn.addEventListener('click', () => {
    clearInterval(timerInterval);
    gameState = null;
    showScreen(botScreen); // Return to bot selection, not home
});

// ============================================================
// BOT LOADING & RENDERING
// ============================================================

async function loadBots() {
    try {
        const res = await fetch('/api/game/bots');
        const botsMap = await res.json();
        renderBotCards(botsMap);
        playBtn.disabled = false;
        playBtn.textContent = 'PLAY';
    } catch (e) {
        botCardsEl.innerHTML = '<div class="bot-loading">Failed to load opponents.</div>';
        console.error('Failed to load bots:', e);
    }
}

function renderBotCards(botsMap) {
    botCardsEl.innerHTML = '';
    for (const [botName, bot] of Object.entries(botsMap)) {
        const card = document.createElement('div');
        card.className = 'bot-card';
        card.dataset.bot = botName;

        const header = document.createElement('div');
        header.className = 'bot-card-header';
        header.innerHTML = `
            <div class="bot-avatar">${bot.avatar}</div>
            <div class="bot-info">
                <div class="bot-name">${bot.name}</div>
                <div class="bot-desc">${bot.description}</div>
            </div>
            <button class="bot-toggle-btn" title="Click to select level">▼</button>
        `;
        header.querySelector('.bot-toggle-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleBotCard(card);
        });

        const levelsEl = document.createElement('div');
        levelsEl.className = 'bot-levels';

        bot.levels.forEach((level, idx) => {
            const btn = document.createElement('button');
            btn.className = 'level-btn';
            btn.dataset.bot = botName;
            btn.dataset.level = idx;

            const gimmickLabel = level.gimmick
                ? `<span class="level-gimmick-badge">✨ ${formatGimmick(level.gimmick)}</span>`
                : '';

            btn.innerHTML = `
                <div>
                    <div class="level-name">Lv ${idx + 1} — ${level.name}</div>
                    <div class="level-desc">${level.description} &nbsp;·&nbsp; 🎯 ${level.targetScore} pts</div>
                </div>
                ${gimmickLabel}
            `;
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                selectLevel(botName, idx, btn);
            });
            levelsEl.appendChild(btn);
        });

        card.appendChild(header);
        card.appendChild(levelsEl);
        botCardsEl.appendChild(card);
    }
}

function formatGimmick(gimmick) {
    if (!gimmick) return '';
    if (gimmick.startsWith('FIXED_LETTER:')) return `Letter: ${gimmick.split(':')[1].toUpperCase()}`;
    if (gimmick.startsWith('MIN_WORD_LENGTH:')) return `Min ${gimmick.split(':')[1]} letters`;
    if (gimmick === 'DOUBLE_SCORE') return '2× CPU Score';
    return gimmick;
}

function toggleBotCard(card) {
    const isOpen = card.classList.contains('open');
    document.querySelectorAll('.bot-card').forEach(c => c.classList.remove('open'));
    if (!isOpen) card.classList.add('open');
}

function selectLevel(botName, levelIndex, btn) {
    document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.bot-card').forEach(c => c.classList.remove('selected'));

    btn.classList.add('active');
    btn.closest('.bot-card').classList.add('selected');

    selectedBotName = botName;
    selectedLevelIndex = levelIndex;

    // Start the game immediately when a level is selected
    startGame();
}

// ============================================================
// GAME START
// ============================================================

async function startGame() {
    if (!selectedBotName || selectedLevelIndex === null) return;

    try {
        const res = await fetch(
            `/api/game/start?botName=${encodeURIComponent(selectedBotName)}&levelIndex=${selectedLevelIndex}`,
            { method: 'POST' }
        );
        gameState = await res.json();

        resetGameUI();
        updateGameUI(gameState);
        showScreen(gameScreen);

        simulateCpuTurn();
    } catch (e) {
        console.error('Error starting game:', e);
        alert('Failed to start game. Is the server running?');
    }
}

// ============================================================
// GAMEPLAY
// ============================================================

wordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSubmitMove();
});

submitBtn.addEventListener('click', handleSubmitMove);

wordInput.addEventListener('input', () => {
    const val = wordInput.value.toLowerCase().replace(/[^a-z]/g, '');
    wordInput.value = val;
    errorMsg.textContent = '';

    if (gameState && val.length > 0) {
        if (val.charAt(0) === gameState.requiredStartingLetter.toLowerCase()) {
            requiredLetterEl.style.backgroundColor = '#06d6a0';
            requiredLetterEl.style.color = '#fff';
        } else {
            requiredLetterEl.style.backgroundColor = '#ef476f';
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
        const res = await fetch(
            `/api/game/playHuman?gameId=${gameState.id}&word=${encodeURIComponent(word)}`,
            { method: 'POST' }
        );
        const turnResult = await res.json();

        if (!turnResult.valid) {
            errorMsg.textContent = turnResult.message;
            enableInput();
            return;
        }

        appendChatBubble('human', turnResult.humanWord, turnResult.humanWordScore);
        gameState = turnResult.gameState;
        wordInput.value = '';
        updateGameUI(gameState);

        if (gameState.gameOver) {
            handleGameOver();
        } else {
            simulateCpuTurn();
        }
    } catch (e) {
        console.error('Error submitting move:', e);
        errorMsg.textContent = 'Network error.';
        enableInput();
    }
}

async function simulateCpuTurn() {
    typingIndicator.classList.remove('hidden');
    chatArea.scrollTop = chatArea.scrollHeight;

    const delay = Math.random() * 1000 + 500;

    try {
        const res = await fetch(`/api/game/playCpu?gameId=${gameState.id}`, { method: 'POST' });
        const turnResult = await res.json();

        setTimeout(() => {
            typingIndicator.classList.add('hidden');

            if (turnResult.cpuWord === 'SKIPPED!') {
                appendChatBubble('cpu', 'SKIPPED!', 0);
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

// ============================================================
// TIMER
// ============================================================

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
    timerBar.style.backgroundColor = '#1a1a2e';
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
        const res = await fetch(`/api/game/timeout?gameId=${gameState.id}`, { method: 'POST' });
        gameState = await res.json();

        appendChatBubble('human', 'SKIPPED!', 0);
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

// ============================================================
// UI HELPERS
// ============================================================

function disableInput() {
    stopTimer();
    wordInput.disabled = true;
    submitBtn.disabled = true;
}

function enableInput() {
    wordInput.disabled = false;
    submitBtn.disabled = false;
    wordInput.focus();
    startTimer();
    requiredLetterEl.style.backgroundColor = '#fff';
    requiredLetterEl.style.color = '#1a1a2e';
}

function updateGameUI(state) {
    humanScoreEl.textContent = state.humanScore;
    cpuScoreEl.textContent = state.cpuScore;

    const pct = (score) => Math.min(100, (score / state.targetScore) * 100);
    humanScoreBar.style.width = `${pct(state.humanScore)}%`;
    cpuScoreBar.style.width = `${pct(state.cpuScore)}%`;

    if (state.requiredStartingLetter) {
        requiredLetterEl.textContent = state.requiredStartingLetter.toUpperCase();
    }
}

function appendChatBubble(player, word, score) {
    const container = document.createElement('div');
    container.className = `chat-bubble-container ${player}`;

    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';

    const wordSpan = document.createElement('span');
    wordSpan.className = 'word-text';
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
    chatArea.scrollTop = chatArea.scrollHeight;
}

function resetGameUI() {
    const cpuName = gameState.cpuName || 'CPU';
    cpuNameDisplay.textContent = cpuName;
    typingCpuName.textContent = cpuName;
    finalCpuName.textContent = cpuName;

    chatArea.innerHTML = `<div class="chat-placeholder">Game Started! ${cpuName} is making the first move...</div>`;
    humanScoreBar.style.width = '0%';
    cpuScoreBar.style.width = '0%';
    errorMsg.textContent = '';
    requiredLetterEl.style.backgroundColor = '#fff';
    requiredLetterEl.style.color = '#1a1a2e';

    if (gameState.activeGimmick) {
        gimmickBanner.textContent = `✨ ${formatGimmick(gameState.activeGimmick)}`;
        gimmickBanner.classList.remove('hidden');
    } else {
        gimmickBanner.classList.add('hidden');
    }
}

function handleGameOver() {
    disableInput();

    finalHumanScore.textContent = gameState.humanScore;
    finalCpuScore.textContent = gameState.cpuScore;

    if (gameState.winner === 'HUMAN') {
        gameOverTitle.textContent = 'YOU WIN!';
        gameOverTitle.style.color = '#06d6a0';
    } else {
        gameOverTitle.textContent = 'YOU LOSE...';
        gameOverTitle.style.color = '#ef476f';
    }

    const subtitle = document.getElementById('game-over-subtitle');
    if (gameState.humanScore >= gameState.targetScore || gameState.cpuScore >= gameState.targetScore) {
        subtitle.textContent = 'Target score reached.';
    } else {
        subtitle.textContent = 'Turn forfeited.';
    }

    setTimeout(() => showScreen(gameOverScreen), 1500);
}

// ============================================================
// BOOT
// ============================================================
loadBots();
