const socket = io();
const chess = new Chess();

const boardElement = document.querySelector(".chessboard");
const statusElement = document.getElementById("status");
const turnDisplay = document.getElementById("turnDisplay");
const whiteTimerEl = document.getElementById("whiteTimer");
const blackTimerEl = document.getElementById("blackTimer");

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;
let roomId = null;

let whiteTime = 5 * 60 * 1000;
let blackTime = 5 * 60 * 1000;
let timerInterval = null;

const formatTime = (ms) => {
    const totalSecs = Math.max(0, Math.floor(ms / 1000));
    const min = String(Math.floor(totalSecs / 60)).padStart(2, '0');
    const sec = String(totalSecs % 60).padStart(2, '0');
    return `${min}:${sec}`;
};

const updateTimerDisplay = () => {
    whiteTimerEl.innerText = `White: ${formatTime(whiteTime)}`;
    blackTimerEl.innerText = `Black: ${formatTime(blackTime)}`;
};

const startTimer = () => {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (chess.turn() === 'w') {
            whiteTime -= 1000;
            if (whiteTime <= 0) {
                clearInterval(timerInterval);
                whiteTime = 0;
            }
        } else {
            blackTime -= 1000;
            if (blackTime <= 0) {
                clearInterval(timerInterval);
                blackTime = 0;
            }
        }
        updateTimerDisplay();
    }, 1000);
};

const renderBoard = () => {
    const board = chess.board();
    boardElement.innerHTML = "";

    if (!playerRole) return;

    const turn = chess.turn() === "w" ? "White's Turn" : "Black's Turn";
    turnDisplay.innerText = turn;
    turnDisplay.classList.remove("hidden");

    const displayBoard = playerRole === "b" ? [...board].reverse() : board;

    displayBoard.forEach((row, rowIndex) => {
        const realRow = playerRole === "b" ? 7 - rowIndex : rowIndex;

        row.forEach((square, colIndex) => {
            const realCol = colIndex;
            const squareDiv = document.createElement("div");

            squareDiv.classList.add("square", (realRow + realCol) % 2 === 0 ? "light" : "dark");
            squareDiv.dataset.row = realRow;
            squareDiv.dataset.col = realCol;

            if (square) {
                const pieceDiv = document.createElement("div");
                pieceDiv.classList.add("piece", square.color === "w" ? "white" : "black");
                pieceDiv.innerText = getPieceUnicode(
                    square.color === "w" ? square.type.toUpperCase() : square.type.toLowerCase()
                );
                pieceDiv.draggable = playerRole === square.color;

                pieceDiv.addEventListener("dragstart", (e) => {
                    if (pieceDiv.draggable) {
                        draggedPiece = pieceDiv;
                        sourceSquare = { row: realRow, col: realCol };
                        e.dataTransfer.setData("text/plain", "");

                        const from = `${String.fromCharCode(97 + realCol)}${8 - realRow}`;
                        const moves = chess.moves({ square: from, verbose: true });
                        moves.forEach(m => {
                            const toRow = 8 - parseInt(m.to[1]);
                            const toCol = m.to.charCodeAt(0) - 97;
                            const selector = `[data-row='${toRow}'][data-col='${toCol}']`;
                            const target = document.querySelector(selector);
                            if (target) target.classList.add("highlight");
                        });
                    }
                });

                pieceDiv.addEventListener("dragend", () => {
                    draggedPiece = null;
                    sourceSquare = null;
                    document.querySelectorAll(".highlight").forEach(el => el.classList.remove("highlight"));
                    renderBoard();
                });

                squareDiv.appendChild(pieceDiv);
            }

            squareDiv.addEventListener("dragover", (e) => e.preventDefault());

            squareDiv.addEventListener("drop", (e) => {
                e.preventDefault();
                if (draggedPiece) {
                    const targetSquare = {
                        row: parseInt(squareDiv.dataset.row),
                        col: parseInt(squareDiv.dataset.col),
                    };
                    handleMove(sourceSquare, targetSquare);
                }
            });

            boardElement.appendChild(squareDiv);
        });
    });
};

const handleMove = (source, target) => {
    const move = {
        from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
        to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
        promotion: 'q',
    };
    socket.emit("move", { move, roomId });
};

const getPieceUnicode = (piece) => {
    const pieces = {
        p: "♟", r: "♜", n: "♞", b: "♝", q: "♛", k: "♚",
        P: "♙", R: "♖", N: "♘", B: "♗", Q: "♕", K: "♔"
    };
    return pieces[piece] || "";
};

socket.on("playerRole", (data) => {
    playerRole = data.role;
    roomId = data.roomId;
    renderBoard();
});

socket.on("status", (msg) => {
    statusElement.innerText = msg;
});

socket.on("gameStart", () => {
    statusElement.classList.add("hidden");
    boardElement.classList.remove("hidden");
    renderBoard();
    startTimer(); // start ticking
});

socket.on("move", (move) => {
    chess.move(move);
    renderBoard();
    startTimer(); // restart timer after move
});

socket.on("boardState", (fen) => {
    chess.load(fen);
    renderBoard();
});

socket.on("invalidMove", () => {
    alert("❌ Illegal move!");
    renderBoard();
});

socket.on("gameOver", (info) => {
    clearInterval(timerInterval);

    const queryParams = new URLSearchParams({
        result: info.result,
        reason: info.reason,
        player: playerRole
    });

    window.location.href = `/end?${queryParams.toString()}`;
});

socket.on("updateTimers", ({ w, b }) => {
    whiteTime = w;
    blackTime = b;
    updateTimerDisplay();
});
