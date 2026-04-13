// ============================================================
// APP STATE
// ============================================================
let gameState = null;
let selectedBotName = null;
let selectedLevelIndex = null;
let timerInterval = null;
let timeRemaining = 15.0;
let currentTurnDuration = 15.0;

function getTurnDuration() {
    if (!gameState) return 15.0;
    const d = gameState.difficultyLevel || 1;
    if (d <= 3) return 15.0;
    if (d <= 6) return 10.0;
    return 5.0;
}

// Auth State
let currentUser = null;
let userEmail = null;
let userPicture = null;
let needsSetup = false;
let selectedIcon = 'robot';
let guestUniqueWords = new Set(JSON.parse(localStorage.getItem('guestUniqueWords') || '[]'));

// ============================================================
// SCREEN REFERENCES
// ============================================================
const homeScreen = document.getElementById('home-screen');
const botScreen = document.getElementById('bot-screen');
const gameScreen = document.getElementById('game-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const loginScreen = document.getElementById('login-screen');
const setupScreen = document.getElementById('setup-screen');

// Home
const playBtn = document.getElementById('play-btn');

// Profile Screen
const profileScreen = document.getElementById('profile-screen');
const profileBackBtn = document.getElementById('profile-back-btn');
const profilePicture = document.getElementById('profile-picture');
const profileFallback = document.getElementById('profile-fallback');
const profileIconDisplay = document.getElementById('profile-icon-display');
const profileUsernameInput = document.getElementById('profile-username-input');
const profileUsernameEditBtn = document.getElementById('profile-username-edit-btn');
const profileUsernameSaveBtn = document.getElementById('profile-username-save-btn');
const profileEmail = document.getElementById('profile-email');
const profileGames = document.getElementById('profile-games');
const profileWon = document.getElementById('profile-won');
const profileUniqueWords = document.getElementById('profile-unique-words');
const profileError = document.getElementById('profile-error');
const profileSignoutBtn = document.getElementById('profile-signout-btn');
const profileLinkBtn = document.getElementById('profile-link-btn');
const profileIconOptions = document.querySelectorAll('.profile-icon-option');
const profileIconSaveBtn = document.getElementById('profile-icon-save-btn');

// Bot Selection
const loginBackBtn = document.getElementById('login-back-btn');
const botCardsEl = document.getElementById('bot-cards');
const backToHomeBtn = document.getElementById('back-to-home-btn');

// Game HUD
const humanScoreEl = document.getElementById('human-score');
const humanNameDisplay = document.getElementById('human-name-display');
const finalHumanName = document.getElementById('final-human-name');
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

// Account UI
const accountBtn = document.getElementById('account-btn');
const accountDropdown = document.getElementById('account-dropdown');
const accountIconDisplay = document.getElementById('account-icon-display');
const accountNameDisplay = document.getElementById('account-name-display');
const dropdownIcon = document.getElementById('dropdown-icon');
const dropdownUsername = document.getElementById('dropdown-username');
const dropdownStats = document.getElementById('dropdown-stats');
const logoutBtn = document.getElementById('logout-btn');

// Login
const loginUsernameInput = document.getElementById('login-username-input');

// Setup UI
const setupUsername = document.getElementById('setup-username');
const setupSubmitBtn = document.getElementById('setup-submit-btn');
const setupError = document.getElementById('setup-error');
const iconOptions = document.querySelectorAll('.icon-option');

// ============================================================
// SCREEN NAVIGATION
// ============================================================

function showScreen(screenEl) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    screenEl.classList.remove('hidden');
}

playBtn.addEventListener('click', () => {
    loadBots();
    showScreen(botScreen);
});
backToHomeBtn.addEventListener('click', () => showScreen(homeScreen));
restartBtn.addEventListener('click', () => {
    showScreen(botScreen);
    loadBots();
});
loginBackBtn.addEventListener('click', () => showScreen(homeScreen));
profileBackBtn.addEventListener('click', () => {
    showScreen(homeScreen);
});

// ============================================================
// AUTH FUNCTIONS
// ============================================================

const ICON_EMOJIS = {
    robot: '🤖',
    ghost: '👻',
    star: '⭐',
    bolt: '⚡',
    skull: '💀'
};

async function checkAuth() {
    try {
        const res = await fetch('/api/auth/user');
        const data = await res.json();

        if (!data.loggedIn) {
            currentUser = null;
            userEmail = null;
            userPicture = null;
            updateAccountUI();
            return false;
        }

        if (data.needsSetup) {
            needsSetup = true;
            currentUser = null;
            userEmail = data.email || null;
            userPicture = null;

            const pendingUsername = localStorage.getItem('pending_username');
            if (pendingUsername) {
                console.log('New user setup with pending username:', pendingUsername);
                await completeSetup(pendingUsername, 'robot');
                localStorage.removeItem('pending_username');
                return true;
            }

            showScreen(setupScreen);
            return false;
        }

        currentUser = {
            username: data.username,
            icon: data.icon,
            gamesPlayed: data.gamesPlayed,
            gamesWon: data.gamesWon || 0,
            uniqueWordsCount: data.uniqueWordsCount || 0
        };
        userEmail = data.email || null;
        userPicture = data.picture || null;
        needsSetup = false;
        updateAccountUI();
        return true;
    } catch (e) {
        console.error('Auth check failed:', e);
        currentUser = null;
        userEmail = null;
        userPicture = null;
        updateAccountUI();
        return false;
    }
}

function updateAccountUI() {
    const iconEmoji = currentUser ? (ICON_EMOJIS[currentUser.icon] || '🤖') : '👤';
    const displayUsername = currentUser ? currentUser.username : 'Sign In';
    const iconClass = currentUser ? currentUser.icon : 'guest';

    // Global account button
    accountIconDisplay.textContent = iconEmoji;
    accountIconDisplay.className = `account-icon ${iconClass}`;
    accountNameDisplay.textContent = displayUsername.substring(0, 15);
    accountNameDisplay.style.display = 'block';

    if (currentUser) {
        // Dropdown info
        dropdownIcon.textContent = iconEmoji;
        dropdownIcon.className = `account-icon ${iconClass}`;
        dropdownUsername.textContent = currentUser.username;
        dropdownStats.textContent = `${currentUser.gamesPlayed} played • ${currentUser.gamesWon || 0} won • ${currentUser.uniqueWordsCount || 0} words`;

        // Update in-game and game-over labels
        if (humanNameDisplay) humanNameDisplay.textContent = currentUser.username;
        if (finalHumanName) finalHumanName.textContent = currentUser.username;
    } else {
        if (humanNameDisplay) humanNameDisplay.textContent = 'YOU';
        if (finalHumanName) finalHumanName.textContent = 'YOU';
        dropdownStats.textContent = `${guestUniqueWords.size} unique words (guest)`;
    }

    // Always show account button
    accountBtn.style.display = 'flex';
}

// Account button click handlers
function toggleDropdown(dropdown) {
    const isShown = dropdown.classList.contains('show');
    document.querySelectorAll('.account-dropdown').forEach(d => d.classList.remove('show'));
    if (!isShown) dropdown.classList.add('show');
}

accountBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentUser) {
        toggleDropdown(accountDropdown);
    } else {
        // Reset login
        loginUsernameInput.value = '';
        showScreen(loginScreen);
    }
});

// Profile link button in dropdown
if (profileLinkBtn) {
    profileLinkBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        accountDropdown.classList.remove('show');
        showProfileScreen();
    });
}

// Sign up with Google - requires username first
const googleSignupBtn = document.getElementById('google-signup-btn');
if (googleSignupBtn) {
    googleSignupBtn.addEventListener('click', () => {
        const username = loginUsernameInput.value.trim();
        if (!username) {
            alert('Please enter a username first');
            return;
        }
        localStorage.setItem('pending_username', username);
        console.log('Signing up with Google...');
        window.location.href = '/oauth2/authorization/google';
    });
}

// Sign in with Google - for existing users (no username needed)
const googleSigninBtn = document.getElementById('google-signin-btn');
if (googleSigninBtn) {
    googleSigninBtn.addEventListener('click', () => {
        localStorage.removeItem('pending_username');
        console.log('Signing in with Google...');
        window.location.href = '/oauth2/authorization/google';
    });
}

document.addEventListener('click', () => {
    document.querySelectorAll('.account-dropdown').forEach(d => d.classList.remove('show'));
});

// Logout handlers
function handleLogout() {
    window.location.href = '/logout';
}

logoutBtn.addEventListener('click', handleLogout);

// Profile Screen Functions
function showProfileScreen() {
    if (!currentUser) return;
    
    profileUsernameInput.value = currentUser.username;
    profileUsernameInput.disabled = true;
    profileUsernameEditBtn.classList.remove('hidden');
    profileUsernameSaveBtn.classList.add('hidden');
    profileError.classList.remove('show');
    
    // Always show the icon (no Google profile picture)
    profilePicture.classList.add('hidden');
    profileFallback.classList.remove('hidden');
    const iconEmoji = ICON_EMOJIS[currentUser.icon] || '🤖';
    profileIconDisplay.textContent = iconEmoji;
    
    // Update icon selection
    profileIconOptions.forEach(opt => {
        opt.classList.remove('selected');
        if (opt.dataset.icon === currentUser.icon) {
            opt.classList.add('selected');
        }
    });
    profileIconSaveBtn.classList.add('hidden');
    
    // Display email
    profileEmail.textContent = userEmail || 'No email';
    
    // Display games played and won
    profileGames.textContent = currentUser ? currentUser.gamesPlayed : '0';
    profileWon.textContent = currentUser ? (currentUser.gamesWon || 0) : '0';
    
    // Display unique words
    if (currentUser) {
        profileUniqueWords.textContent = currentUser.uniqueWordsCount || 0;
    } else {
        profileUniqueWords.textContent = guestUniqueWords.size + ' (local)';
    }
    
    showScreen(profileScreen);
}

// Edit username
profileUsernameEditBtn.addEventListener('click', () => {
    profileUsernameInput.disabled = false;
    profileUsernameInput.focus();
    profileUsernameEditBtn.classList.add('hidden');
    profileUsernameSaveBtn.classList.remove('hidden');
});

// Save username
profileUsernameSaveBtn.addEventListener('click', async () => {
    const newUsername = profileUsernameInput.value.trim();
    if (!newUsername) {
        profileError.textContent = 'Username cannot be empty';
        profileError.classList.add('show');
        return;
    }
    
    try {
        const res = await fetch('/api/auth/update-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: newUsername })
        });
        
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Update failed');
        }
        
        const data = await res.json();
        currentUser.username = data.username;
        updateAccountUI();
        
        profileUsernameInput.disabled = true;
        profileUsernameEditBtn.classList.remove('hidden');
        profileUsernameSaveBtn.classList.add('hidden');
        profileError.classList.remove('show');
    } catch (e) {
        profileError.textContent = e.message || 'Failed to update username';
        profileError.classList.add('show');
    }
});

// Enter key to save username
profileUsernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        profileUsernameSaveBtn.click();
    }
});

// Sign out
profileSignoutBtn.addEventListener('click', () => {
    window.location.href = '/logout';
});

// Profile icon selection
profileIconOptions.forEach(option => {
    option.addEventListener('click', () => {
        profileIconOptions.forEach(o => o.classList.remove('selected'));
        option.classList.add('selected');
        profileIconSaveBtn.classList.remove('hidden');
    });
});

// Save icon
profileIconSaveBtn.addEventListener('click', async () => {
    const selectedOption = document.querySelector('.profile-icon-option.selected');
    if (!selectedOption) return;
    
    const newIcon = selectedOption.dataset.icon;
    
    try {
        const res = await fetch('/api/auth/update-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ icon: newIcon })
        });
        
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Update failed');
        }
        
        const data = await res.json();
        currentUser.icon = data.icon;
        updateAccountUI();
        
        // Update display
        const iconEmoji = ICON_EMOJIS[currentUser.icon] || '🤖';
        profileIconDisplay.textContent = iconEmoji;
        
        profileIconSaveBtn.classList.add('hidden');
    } catch (e) {
        profileError.textContent = e.message || 'Failed to update icon';
        profileError.classList.add('show');
    }
});

// Icon selection
iconOptions.forEach(option => {
    option.addEventListener('click', () => {
        iconOptions.forEach(o => o.classList.remove('selected'));
        option.classList.add('selected');
        selectedIcon = option.dataset.icon;
    });
});

// Helper to complete setup
async function completeSetup(username, icon) {
    try {
        const res = await fetch('/api/auth/setup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, icon })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Setup failed');
        }

        const data = await res.json();
        currentUser = {
            username: data.username,
            icon: data.icon,
            gamesPlayed: data.gamesPlayed,
            gamesWon: data.gamesWon || 0,
            uniqueWordsCount: data.uniqueWordsCount || 0
        };
        needsSetup = false;
        updateAccountUI();
    } catch (e) {
        console.error('Setup failed:', e);
        throw e;
    }
}

// Setup form submission
setupSubmitBtn.addEventListener('click', async () => {
    const username = setupUsername.value.trim();
    if (!username) {
        setupError.textContent = 'Please enter a username';
        setupError.classList.add('show');
        return;
    }

    setupError.classList.remove('show');

    try {
        await completeSetup(username, selectedIcon);
        showScreen(homeScreen);
    } catch (e) {
        setupError.textContent = e.message || 'Network error. Try again.';
        setupError.classList.add('show');
    }
});

// Quit — immediate, no dialog
homeBtn.addEventListener('click', async () => {
    clearInterval(timerInterval);
    gameState = null;
    showScreen(botScreen);
    loadBots();
});

// ============================================================
// BOT LOADING & RENDERING
// ============================================================

async function loadBots() {
    try {
        const res = await fetch('/api/game/bots');
        const data = await res.json();
        const botsMap = data.bots || data;
        const unlockedLevels = {
            'Adam': data.unlockedAdam || [0],
            'Eve': data.unlockedEve || [0],
            'Lucifer': data.unlockedLucifer || [0]
        };
        renderBotCards(botsMap, unlockedLevels);
        playBtn.disabled = false;
        playBtn.textContent = 'PLAY';
    } catch (e) {
        botCardsEl.innerHTML = '<div class="bot-loading">Failed to load opponents.</div>';
        console.error('Failed to load bots:', e);
    }
}

function renderBotCards(botsMap, unlockedLevels = {'Adam': [0], 'Eve': [0]}) {
    botCardsEl.innerHTML = '';
    for (const [botName, bot] of Object.entries(botsMap)) {
        const card = document.createElement('div');
        card.className = 'bot-card';
        if (botName === selectedBotName) {
            card.classList.add('open');
        }
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

        const unlocked = unlockedLevels[botName] || [0];

        bot.levels.forEach((level, idx) => {
            const btn = document.createElement('button');
            btn.className = 'level-btn';
            btn.dataset.bot = botName;
            btn.dataset.level = idx;
            
            const isLocked = !unlocked.includes(idx);
            if (isLocked) {
                btn.classList.add('locked');
                btn.disabled = true;
            }

            const lockIcon = isLocked ? '🔒 ' : '';
            const gimmickLabel = level.gimmick
                ? `<span class="level-gimmick-badge">✨ ${formatGimmick(level.gimmick)}</span>`
                : '';

            btn.innerHTML = `
                <div>
                    <div class="level-name">${lockIcon}Lv ${idx + 1} — ${level.name}</div>
                    <div class="level-desc">${level.description} &nbsp;·&nbsp; 🎯 ${level.targetScore} pts</div>
                </div>
                ${gimmickLabel}
            `;
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!isLocked) {
                    selectLevel(botName, idx, btn);
                }
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
    if (gimmick.startsWith('MIN_WORD_LENGTH:')) {
        const parts = gimmick.split(':');
        if (parts.length > 2) {
            return `Min ${parts[1]} letters, Ends: ${parts[2].toUpperCase()}`;
        }
        return `Min ${gimmick.split(':')[1]} letters`;
    }
    if (gimmick.startsWith('ENDS_WITH:')) return `Ends: ${gimmick.split(':')[1].toUpperCase()}`;
    if (gimmick === 'DOUBLE_SCORE') return '2× CPU Score';
    return gimmick;
}

function toggleBotCard(card) {
    const isOpen = card.classList.contains('open');
    document.querySelectorAll('.bot-card').forEach(c => c.classList.remove('open'));
    if (!isOpen) card.classList.add('open');
}

function selectLevel(botName, levelIndex, btn) {
    // Guests can play too! Only force setup if they ARE logged in but haven't chosen an icon.
    if (needsSetup) {
        showScreen(setupScreen);
        return;
    }

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

    const lowerWord = word.toLowerCase().trim();
    let isUniqueWord = false;
    let uniqueWordBonus = 0;
    
    if (!currentUser) {
        if (!guestUniqueWords.has(lowerWord)) {
            isUniqueWord = true;
            uniqueWordBonus = 5;
            guestUniqueWords.add(lowerWord);
            localStorage.setItem('guestUniqueWords', JSON.stringify([...guestUniqueWords]));
        }
    }

    try {
        const res = await fetch(
            `/api/game/playHuman?gameId=${gameState.id}&word=${encodeURIComponent(word)}`,
            { method: 'POST' }
        );
        const turnResult = await res.json();

        if (!turnResult.valid) {
            errorMsg.textContent = turnResult.message;
            enableInput(true); // true means resume timer
            return;
        }

        timerBar.style.width = '100%';
        timerBar.className = 'timer-bar';

        if (!currentUser && isUniqueWord) {
            turnResult.isUniqueWord = true;
            turnResult.uniqueWordBonus = uniqueWordBonus;
            turnResult.humanWordScore += uniqueWordBonus;
        }

        appendChatBubble('human', turnResult.humanWord, turnResult.humanWordScore, turnResult.isUniqueWord, turnResult.uniqueWordBonus);
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

function startTimer(resume = false) {
    if (!resume) {
        currentTurnDuration = getTurnDuration();
        timeRemaining = currentTurnDuration;
        timerBar.classList.remove('warning', 'danger');
    }
    clearInterval(timerInterval);

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
}

function updateTimerBar() {
    const percent = Math.max(0, (timeRemaining / currentTurnDuration) * 100);
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

function enableInput(resumeTimer = false) {
    wordInput.disabled = false;
    submitBtn.disabled = false;
    wordInput.focus();
    startTimer(resumeTimer);
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

function appendChatBubble(player, word, score, isUniqueWord = false, uniqueWordBonus = 0) {
    if (chatArea.querySelector('.chat-placeholder')) {
        chatArea.innerHTML = '';
    }
    const container = document.createElement('div');
    container.className = `chat-bubble-container ${player}`;

    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    
    if (isUniqueWord && player === 'human') {
        bubble.classList.add('golden-bubble');
    }

    const wordSpan = document.createElement('span');
    wordSpan.className = 'word-text';
    const firstLetter = word.charAt(0).toUpperCase();
    const rest = word.substring(1);
    wordSpan.innerHTML = `<u>${firstLetter}</u>${rest}`;

    const scoreSpan = document.createElement('span');
    scoreSpan.className = 'word-score';
    
    if (isUniqueWord && uniqueWordBonus > 0) {
        scoreSpan.textContent = `+${score} (NEW! +${uniqueWordBonus})`;
    } else {
        scoreSpan.textContent = `+${score}`;
    }

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

    chatArea.innerHTML = `<div class="chat-placeholder">Game started! ${cpuName} is making the first move...</div>`;
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

    // Increment games played
    if (currentUser) {
        const won = gameState.winner === 'HUMAN';
        fetch(`/api/auth/increment-games?won=${won}`, { method: 'POST' })
            .then(res => res.json())
            .then(data => {
                if (data.gamesPlayed !== undefined) {
                    currentUser.gamesPlayed = data.gamesPlayed;
                    currentUser.gamesWon = data.gamesWon || 0;
                    currentUser.uniqueWordsCount = data.uniqueWordsCount || currentUser.uniqueWordsCount;
                    updateAccountUI();
                }
            })
            .catch(console.error);
    }

    finalHumanScore.textContent = gameState.humanScore;
    finalCpuScore.textContent = gameState.cpuScore;

    if (gameState.winner === 'HUMAN') {
        gameOverTitle.textContent = `${currentUser ? currentUser.username : 'YOU'} WIN!`;
        gameOverTitle.style.color = '#06d6a0';
    } else {
        gameOverTitle.textContent = `${currentUser ? currentUser.username : 'YOU'} LOSE...`;
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
async function init() {
    // Show home screen immediately
    showScreen(homeScreen);

    // Check auth in background
    await checkAuth();

    // Load bots regardless
    loadBots();
}

init();
