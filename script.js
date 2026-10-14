const ROWS = 6;
const COLS = 7;
const EMPTY = 0;
const PLAYER_1 = 1;
const PLAYER_2 = 2; // Can be human or AI

// Game State
let board = [];
let currentPlayer = PLAYER_1;
let gameActive = false;
let gameMode = 'pvp'; // 'pvp' or 'pva'
let aiDifficulty = 3; // 1 to 5
let matchLength = 3; // 1, 3, 5
let currentRound = 1;
let scores = { p1: 0, p2: 0 };
let animating = false;

// DOM Elements
const setupScreen = document.getElementById('setup-screen');
const gameScreen = document.getElementById('game-screen');
const boardEl = document.getElementById('board');
const btnPvp = document.getElementById('btn-pvp');
const btnPva = document.getElementById('btn-pva');
const aiLevelsSection = document.getElementById('ai-levels-section');
const matchLengthSection = document.getElementById('match-length-section');
const levelBtns = document.querySelectorAll('.level-btn');
const matchBtns = document.querySelectorAll('.match-btn');
const btnStartGame = document.getElementById('btn-start-game');

const scoreP1El = document.getElementById('score-p1');
const scoreP2El = document.getElementById('score-p2');
const nameP2El = document.getElementById('name-p2');
const roundDisplay = document.getElementById('round-display');
const turnIndicator = document.getElementById('turn-indicator');
const btnResetRound = document.getElementById('btn-reset-round');
const btnQuit = document.getElementById('btn-quit');

const resultModal = document.getElementById('result-modal');
const resultTitle = document.getElementById('result-title');
const resultMessage = document.getElementById('result-message');
const btnNextRound = document.getElementById('btn-next-round');
const btnModalQuit = document.getElementById('btn-modal-quit');

// Column Marker (Hover)
let colMarker = document.createElement('div');
colMarker.className = 'col-marker';
document.querySelector('.board-container').appendChild(colMarker);

// Initialize setup listeners
btnPvp.addEventListener('click', () => {
    gameMode = 'pvp';
    btnPvp.classList.add('selected');
    btnPva.classList.remove('selected');
    aiLevelsSection.style.display = 'none';
    matchLengthSection.style.display = 'block';
    checkStartReady();
});

btnPva.addEventListener('click', () => {
    gameMode = 'pva';
    btnPva.classList.add('selected');
    btnPvp.classList.remove('selected');
    aiLevelsSection.style.display = 'block';
    matchLengthSection.style.display = 'block';
    checkStartReady();
});

levelBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        levelBtns.forEach(b => b.classList.remove('selected'));
        e.target.classList.add('selected');
        aiDifficulty = parseInt(e.target.dataset.level);
        checkStartReady();
    });
});

matchBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        matchBtns.forEach(b => b.classList.remove('selected'));
        e.target.classList.add('selected');
        matchLength = parseInt(e.target.dataset.rounds);
        checkStartReady();
    });
});

function checkStartReady() {
    let modeReady = gameMode === 'pvp' || (gameMode === 'pva' && aiDifficulty > 0);
    let matchReady = matchLength > 0;
    if (modeReady && matchReady) {
        btnStartGame.disabled = false;
    }
}

btnStartGame.addEventListener('click', startGame);
btnResetRound.addEventListener('click', () => initRound(true));
btnQuit.addEventListener('click', quitToMenu);
btnModalQuit.addEventListener('click', quitToMenu);
btnNextRound.addEventListener('click', () => {
    resultModal.classList.remove('active');
    initRound(false);
});

// Board Interaction
boardEl.addEventListener('mousemove', handleMouseMove);
boardEl.addEventListener('mouseleave', () => colMarker.style.opacity = '0');
boardEl.addEventListener('click', handleBoardClick);

function startGame() {
    setupScreen.classList.remove('active');
    gameScreen.classList.add('active');
    
    nameP2El.textContent = gameMode === 'pva' ? `Computer (Lvl ${aiDifficulty})` : 'Player 2';
    scores = { p1: 0, p2: 0 };
    currentRound = 1;
    updateScoreBoard();
    
    initRound(false);
}

function initRound(isReset) {
    board = Array(ROWS).fill(null).map(() => Array(COLS).fill(EMPTY));
    boardEl.innerHTML = '';
    animating = false;
    
    // Create cells
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = r;
            cell.dataset.col = c;
            boardEl.appendChild(cell);
        }
    }
    
    // Determine starter (loser of last round, or P1 if reset/start)
    if (isReset || currentRound === 1) {
        currentPlayer = PLAYER_1;
    }
    
    gameActive = true;
    roundDisplay.textContent = `Round ${currentRound} of ${matchLength}`;
    updateTurnIndicator();
    
    if (gameMode === 'pva' && currentPlayer === PLAYER_2) {
        setTimeout(makeAIMove, 500);
    }
}

function handleMouseMove(e) {
    if (!gameActive || animating || (gameMode === 'pva' && currentPlayer === PLAYER_2)) {
        colMarker.style.opacity = '0';
        return;
    }
    
    const rect = boardEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const colWidth = rect.width / COLS;
    const col = Math.floor(x / colWidth);
    
    if (col >= 0 && col < COLS && getNextOpenRow(board, col) !== -1) {
        colMarker.style.left = `${col * colWidth + (colWidth - colMarker.offsetWidth) / 2 + 15}px`; // +15 for padding
        colMarker.className = `col-marker p${currentPlayer}`;
        colMarker.style.opacity = '1';
    } else {
        colMarker.style.opacity = '0';
    }
}

function handleBoardClick(e) {
    if (!gameActive || animating || (gameMode === 'pva' && currentPlayer === PLAYER_2)) return;
    
    const rect = boardEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const colWidth = rect.width / COLS;
    const col = Math.floor(x / colWidth);
    
    if (col >= 0 && col < COLS) {
        dropDisc(col);
    }
}

function dropDisc(col) {
    const row = getNextOpenRow(board, col);
    if (row === -1) return;
    
    animating = true;
    colMarker.style.opacity = '0';
    
    // Update logic board
    board[row][col] = currentPlayer;
    
    // Visual drop
    const cellIndex = row * COLS + col;
    const cellEl = boardEl.children[cellIndex];
    
    const disc = document.createElement('div');
    disc.className = `disc p${currentPlayer}`;
    cellEl.appendChild(disc);
    
    // Trigger animation
    setTimeout(() => {
        disc.classList.add('drop');
    }, 10);
    
    // Wait for animation to finish
    setTimeout(() => {
        checkGameState(row, col);
    }, 500);
}

function checkGameState(row, col) {
    const win = checkWin(board, row, col, currentPlayer);
    
    if (win) {
        handleWin(win);
    } else if (isBoardFull(board)) {
        handleDraw();
    } else {
        currentPlayer = currentPlayer === PLAYER_1 ? PLAYER_2 : PLAYER_1;
        updateTurnIndicator();
        animating = false;
        
        if (gameMode === 'pva' && currentPlayer === PLAYER_2 && gameActive) {
            setTimeout(makeAIMove, 100);
        }
    }
}

function updateTurnIndicator() {
    turnIndicator.textContent = currentPlayer === PLAYER_1 ? "P1's Turn" : (gameMode === 'pva' ? "AI's Turn" : "P2's Turn");
    turnIndicator.className = `turn-p${currentPlayer}`;
}

function handleWin(winObj) {
    gameActive = false;
    animating = false;
    
    // Highlight winning discs
    winObj.cells.forEach(([r, c]) => {
        const index = r * COLS + c;
        const disc = boardEl.children[index].querySelector('.disc');
        if (disc) disc.classList.add('win-highlight');
    });
    
    // Update scores
    if (currentPlayer === PLAYER_1) scores.p1++;
    else scores.p2++;
    
    updateScoreBoard();
    
    // Check match win
    const requiredWins = Math.ceil(matchLength / 2);
    const matchWon = scores.p1 >= requiredWins || scores.p2 >= requiredWins;
    
    setTimeout(() => {
        showResult(currentPlayer === PLAYER_1 ? 'Player 1 Wins!' : (gameMode === 'pva' ? 'Computer Wins!' : 'Player 2 Wins!'), matchWon);
    }, 1000);
}

function handleDraw() {
    gameActive = false;
    animating = false;
    setTimeout(() => {
        showResult("It's a Draw!", false);
    }, 500);
}

function updateScoreBoard() {
    scoreP1El.textContent = scores.p1;
    scoreP2El.textContent = scores.p2;
}

function showResult(title, isMatchOver) {
    resultTitle.textContent = title;
    
    if (isMatchOver) {
        resultMessage.textContent = `${title.split(' ')[0]} won the match!`;
        btnNextRound.style.display = 'none';
        btnModalQuit.textContent = 'Back to Menu';
        btnModalQuit.classList.replace('btn-secondary', 'btn-primary');
    } else {
        resultMessage.textContent = `Get ready for round ${currentRound + 1}!`;
        btnNextRound.style.display = 'block';
        btnModalQuit.textContent = 'End Match';
        btnModalQuit.classList.replace('btn-primary', 'btn-secondary');
        currentRound++;
    }
    
    resultModal.classList.add('active');
}

function quitToMenu() {
    resultModal.classList.remove('active');
    gameScreen.classList.remove('active');
    setupScreen.classList.add('active');
}

// Logic Helpers
function getNextOpenRow(b, col) {
    for (let r = ROWS - 1; r >= 0; r--) {
        if (b[r][col] === EMPTY) {
            return r;
        }
    }
    return -1;
}

function isBoardFull(b) {
    for (let c = 0; c < COLS; c++) {
        if (b[0][c] === EMPTY) return false;
    }
    return true;
}

function checkWin(b, r, c, player) {
    const directions = [
        [0, 1],  // Horizontal
        [1, 0],  // Vertical
        [1, 1],  // Diagonal /
        [1, -1]  // Diagonal \
    ];
    
    for (let dir of directions) {
        let count = 1;
        let cells = [[r, c]];
        
        // Forward
        for (let i = 1; i <= 3; i++) {
            const nr = r + dir[0] * i;
            const nc = c + dir[1] * i;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && b[nr][nc] === player) {
                count++;
                cells.push([nr, nc]);
            } else {
                break;
            }
        }
        
        // Backward
        for (let i = 1; i <= 3; i++) {
            const nr = r - dir[0] * i;
            const nc = c - dir[1] * i;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && b[nr][nc] === player) {
                count++;
                cells.push([nr, nc]);
            } else {
                break;
            }
        }
        
        if (count >= 4) {
            return { cells };
        }
    }
    return null;
}

// --- AI Implementation (Minimax with Alpha-Beta Pruning) ---

function makeAIMove() {
    animating = true;
    // Slight artificial delay for realism
    setTimeout(() => {
        let col;
        if (aiDifficulty === 1) {
            col = getRandomMove(board);
        } else {
            const depths = {2: 2, 3: 4, 4: 6, 5: 8};
            const depth = depths[aiDifficulty];
            col = getBestMove(board, depth);
        }
        dropDisc(col);
    }, 500);
}

function getRandomMove(b) {
    const validMoves = getValidMoves(b);
    return validMoves[Math.floor(Math.random() * validMoves.length)];
}

function getValidMoves(b) {
    let validLocations = [];
    for (let c = 0; c < COLS; c++) {
        if (b[0][c] === EMPTY) {
            validLocations.push(c);
        }
    }
    return validLocations;
}

function evaluateWindow(window, player) {
    let score = 0;
    const oppPlayer = player === PLAYER_1 ? PLAYER_2 : PLAYER_1;
    let pCount = 0;
    let emptyCount = 0;
    let oppCount = 0;
    
    for(let i=0; i<4; i++) {
        if(window[i] === player) pCount++;
        else if(window[i] === EMPTY) emptyCount++;
        else if(window[i] === oppPlayer) oppCount++;
    }
    
    if (pCount === 4) {
        score += 100;
    } else if (pCount === 3 && emptyCount === 1) {
        score += 5;
    } else if (pCount === 2 && emptyCount === 2) {
        score += 2;
    }
    
    if (oppCount === 3 && emptyCount === 1) {
        score -= 80;
    }
    
    return score;
}

function scorePosition(b, player) {
    let score = 0;
    
    // Score center column (positional advantage)
    let centerArray = [];
    for(let r=0; r<ROWS; r++) centerArray.push(b[r][Math.floor(COLS/2)]);
    let centerCount = centerArray.filter(p => p === player).length;
    score += centerCount * 3;
    
    // Horizontal
    for (let r = 0; r < ROWS; r++) {
        let rowArray = b[r];
        for (let c = 0; c < COLS - 3; c++) {
            let window = rowArray.slice(c, c + 4);
            score += evaluateWindow(window, player);
        }
    }
    
    // Vertical
    for (let c = 0; c < COLS; c++) {
        let colArray = [];
        for(let r=0; r<ROWS; r++) colArray.push(b[r][c]);
        for (let r = 0; r < ROWS - 3; r++) {
            let window = colArray.slice(r, r + 4);
            score += evaluateWindow(window, player);
        }
    }
    
    // Positive Diagonal
    for (let r = 0; r < ROWS - 3; r++) {
        for (let c = 0; c < COLS - 3; c++) {
            let window = [b[r][c], b[r+1][c+1], b[r+2][c+2], b[r+3][c+3]];
            score += evaluateWindow(window, player);
        }
    }
    
    // Negative Diagonal
    for (let r = 0; r < ROWS - 3; r++) {
        for (let c = 0; c < COLS - 3; c++) {
            let window = [b[r+3][c], b[r+2][c+1], b[r+1][c+2], b[r][c+3]];
            score += evaluateWindow(window, player);
        }
    }
    
    return score;
}

function isTerminalNode(b) {
    return checkWinGlobal(b, PLAYER_1) || checkWinGlobal(b, PLAYER_2) || getValidMoves(b).length === 0;
}

function checkWinGlobal(b, player) {
    // Horizontal
    for (let c = 0; c < COLS - 3; c++) {
        for (let r = 0; r < ROWS; r++) {
            if (b[r][c] === player && b[r][c+1] === player && b[r][c+2] === player && b[r][c+3] === player) return true;
        }
    }
    // Vertical
    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS - 3; r++) {
            if (b[r][c] === player && b[r+1][c] === player && b[r+2][c] === player && b[r+3][c] === player) return true;
        }
    }
    // Positive Diagonal
    for (let c = 0; c < COLS - 3; c++) {
        for (let r = 0; r < ROWS - 3; r++) {
            if (b[r][c] === player && b[r+1][c+1] === player && b[r+2][c+2] === player && b[r+3][c+3] === player) return true;
        }
    }
    // Negative Diagonal
    for (let c = 0; c < COLS - 3; c++) {
        for (let r = 3; r < ROWS; r++) {
            if (b[r][c] === player && b[r-1][c+1] === player && b[r-2][c+2] === player && b[r-3][c+3] === player) return true;
        }
    }
    return false;
}

function copyBoard(b) {
    return b.map(row => [...row]);
}

// Order moves: center first, then outwards for alpha-beta efficiency
const moveOrder = [3, 4, 2, 5, 1, 6, 0]; 

function getBestMove(b, depth) {
    let validMoves = getValidMoves(b);
    
    // Sort moves by preference (center column is typically best)
    validMoves.sort((a, b) => {
        return moveOrder.indexOf(a) - moveOrder.indexOf(b);
    });

    let bestScore = -Infinity;
    let bestCol = validMoves[0];
    
    for (let col of validMoves) {
        let row = getNextOpenRow(b, col);
        let bCopy = copyBoard(b);
        bCopy[row][col] = PLAYER_2;
        let score = minimax(bCopy, depth - 1, -Infinity, Infinity, false);
        if (score > bestScore) {
            bestScore = score;
            bestCol = col;
        }
    }
    return bestCol;
}

function minimax(b, depth, alpha, beta, maximizingPlayer) {
    let validMoves = getValidMoves(b);
    let isTerminal = isTerminalNode(b);
    
    if (depth === 0 || isTerminal) {
        if (isTerminal) {
            if (checkWinGlobal(b, PLAYER_2)) return 1000000000000;
            else if (checkWinGlobal(b, PLAYER_1)) return -1000000000000;
            else return 0; // Draw
        } else {
            return scorePosition(b, PLAYER_2);
        }
    }
    
    validMoves.sort((a, b) => moveOrder.indexOf(a) - moveOrder.indexOf(b));

    if (maximizingPlayer) {
        let value = -Infinity;
        for (let col of validMoves) {
            let row = getNextOpenRow(b, col);
            let bCopy = copyBoard(b);
            bCopy[row][col] = PLAYER_2;
            value = Math.max(value, minimax(bCopy, depth - 1, alpha, beta, false));
            alpha = Math.max(alpha, value);
            if (alpha >= beta) break;
        }
        return value;
    } else { // Minimizing player (Player 1)
        let value = Infinity;
        for (let col of validMoves) {
            let row = getNextOpenRow(b, col);
            let bCopy = copyBoard(b);
            bCopy[row][col] = PLAYER_1;
            value = Math.min(value, minimax(bCopy, depth - 1, alpha, beta, true));
            beta = Math.min(beta, value);
            if (alpha >= beta) break;
        }
        return value;
    }
}
