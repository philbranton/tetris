// Get canvas and context
const canvas = document.getElementById('tetris-board');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const startButton = document.getElementById('start-button');

// --- Constants ---
const ROWS = 20;
const COLS = 10;
const BLOCK_SIZE = 30; // 30px per block

// --- Tetromino Shapes and Colors ---
const COLORS = [
    null,       // 0: Empty
    '#FF0D72',  // 1: T
    '#0DC2FF',  // 2: I
    '#0DFF72',  // 3: S
    '#F538FF',  // 4: Z
    '#FF8E0D',  // 5: J
    '#FFE138',  // 6: L
    '#3877FF'   // 7: O
];

const SHAPES = [
    [], // Empty shape
    [[0, 1, 0], [1, 1, 1], [0, 0, 0]], // T
    [[0, 0, 0, 0], [2, 2, 2, 2], [0, 0, 0, 0], [0, 0, 0, 0]], // I
    [[0, 3, 3], [3, 3, 0], [0, 0, 0]], // S
    [[4, 4, 0], [0, 4, 4], [0, 0, 0]], // Z
    [[5, 0, 0], [5, 5, 5], [0, 0, 0]], // J
    [[0, 0, 6], [6, 6, 6], [0, 0, 0]], // L
    [[7, 7], [7, 7]]  // O
];

// --- Game State Variables ---
let board = [];
let score = 0;
let gameOver = false;
let currentPiece;
let gameLoopId;

// --- Piece Class ---
class Piece {
    constructor(shape, colorIndex) {
        this.shape = shape;
        this.color = COLORS[colorIndex];
        // Start position
        this.x = Math.floor(COLS / 2) - Math.floor(this.shape[0].length / 2);
        this.y = 0;
    }

    draw() {
        ctx.fillStyle = this.color;
        this.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    ctx.fillRect(
                        (this.x + x) * BLOCK_SIZE, 
                        (this.y + y) * BLOCK_SIZE, 
                        BLOCK_SIZE, 
                        BLOCK_SIZE
                    );
                }
            });
        });
    }

    move(dx, dy) {
        this.x += dx;
        this.y += dy;
    }

    rotate() {
        // Transpose and reverse rows to rotate 90 deg
        const newShape = this.shape[0].map((_, i) => 
            this.shape.map(row => row[i])
        );
        this.shape = newShape.map(row => row.reverse());
    }
}

// --- Game Functions ---

// Create an empty game board (2D array filled with 0s)
function createBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

// Spawn a new random piece
function spawnPiece() {
    const randIndex = Math.floor(Math.random() * (SHAPES.length - 1)) + 1;
    const newShape = SHAPES[randIndex];
    return new Piece(newShape, randIndex);
}

// Check if a piece's move is valid (no collisions)
function isValidMove(piece, newX, newY, newShape) {
    const shape = newShape || piece.shape;
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x] > 0) {
                let boardX = newX + x;
                let boardY = newY + y;

                // Check wall collision
                if (boardX < 0 || boardX >= COLS || boardY >= ROWS) {
                    return false;
                }
                // Check other piece collision (only if on the board)
                if (boardY >= 0 && board[boardY][boardX] > 0) {
                    return false;
                }
            }
        }
    }
    return true;
}

// Lock a piece into the board when it lands
function lockPiece() {
    currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value > 0) {
                // Check for game over
                if (currentPiece.y + y < 0) {
                    gameOver = true;
                    return;
                }
                board[currentPiece.y + y][currentPiece.x + x] = value;
            }
        });
    });

    clearLines();
    if (!gameOver) {
        currentPiece = spawnPiece();
    }
}

// Check for and clear completed lines
function clearLines() {
    let linesCleared = 0;
    for (let y = ROWS - 1; y >= 0; y--) {
        if (board[y].every(cell => cell > 0)) {
            linesCleared++;
            // Remove the line and add a new empty line at the top
            board.splice(y, 1);
            board.unshift(Array(COLS).fill(0));
            // We need to re-check the same row index
            y++;
        }
    }
    // Update score
    if (linesCleared > 0) {
        // Simple scoring: 100 for 1 line, 300 for 2, 500 for 3, 800 for 4 (Tetris)
        score += linesCleared === 1 ? 100 : linesCleared === 2 ? 300 : linesCleared === 3 ? 500 : 800;
        scoreElement.textContent = score;
    }
}

// Draw the static, locked pieces on the board
function drawBoard() {
    board.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value > 0) {
                ctx.fillStyle = COLORS[value];
                ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            }
        });
    });
}

// Main draw function (clears and redraws everything)
function draw() {
    // Clear the canvas
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Draw the board and the current piece
    drawBoard();
    currentPiece.draw();
}

// --- Game Loop ---
let dropCounter = 0;
let dropInterval = 1000; // 1000ms = 1 second
let lastTime = 0;

function gameLoop(time = 0) {
    if (gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
        cancelAnimationFrame(gameLoopId);
        startButton.textContent = "Play Again";
        return;
    }

    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;

    if (dropCounter > dropInterval) {
        // Move piece down
        if (isValidMove(currentPiece, currentPiece.x, currentPiece.y + 1)) {
            currentPiece.move(0, 1);
        } else {
            // Can't move down, so lock it
            lockPiece();
        }
        dropCounter = 0;
    }

    draw();
    gameLoopId = requestAnimationFrame(gameLoop);
}

// --- Event Handlers ---
document.addEventListener('keydown', event => {
    if (gameOver) return;

    if (event.key === 'ArrowLeft') {
        if (isValidMove(currentPiece, currentPiece.x - 1, currentPiece.y)) {
            currentPiece.move(-1, 0);
        }
    } else if (event.key === 'ArrowRight') {
        if (isValidMove(currentPiece, currentPiece.x + 1, currentPiece.y)) {
            currentPiece.move(1, 0);
        }
    } else if (event.key === 'ArrowDown') {
        if (isValidMove(currentPiece, currentPiece.x, currentPiece.y + 1)) {
            currentPiece.move(0, 1);
            dropCounter = 0; // Reset drop timer
        } else {
            lockPiece();
        }
    } else if (event.key === 'ArrowUp') {
        // Handle rotation
        const originalShape = currentPiece.shape;
        currentPiece.rotate();
        
        // Check if rotation is valid (e.g., not into a wall or piece)
        if (!isValidMove(currentPiece, currentPiece.x, currentPiece.y)) {
            // If not, rotate back
            currentPiece.shape = originalShape;
        }
    }
    draw(); // Redraw immediately on input
});

startButton.addEventListener('click', () => {
    // Stop any existing game loop
    if (gameLoopId) {
        cancelAnimationFrame(gameLoopId);
    }
    // Reset game
    board = createBoard();
    score = 0;
    scoreElement.textContent = score;
    currentPiece = spawnPiece();
    gameOver = false;
    dropInterval = 1000; // Reset speed
    startButton.textContent = "Start Game";
    // Start new game
    gameLoop();
});