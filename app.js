const express = require('express');
const http = require('http');
const socket = require('socket.io');
const { Chess } = require('chess.js');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socket(server);

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.render('index', { title: 'Chess Game' });
});

let waitingPlayer = null;
let games = {};
const TIMER_DURATION = 5 * 60 * 1000; // 5 minutes

// Timer update function
function updateTimers(roomId) {
    const game = games[roomId];
    if (!game) return;

    const now = Date.now();
    const elapsed = now - game.lastMoveTime;

    const currentColor = game.currentTurn;
    game.timers[currentColor] -= elapsed;
    game.lastMoveTime = now;

    io.to(roomId).emit("updateTimers", {
        w: game.timers.w,
        b: game.timers.b
    });

    if (game.timers[currentColor] <= 0) {
        const winner = currentColor === 'w' ? 'b' : 'w';
        io.to(roomId).emit("gameOver", {
            result: winner,
            reason: "timeout"
        });
        delete games[roomId];
    }
}

io.on('connection', (socket) => {
    if (!waitingPlayer) {
        waitingPlayer = socket;
        socket.emit("status", "⌛ Searching for opponent...");
    } else {
        const roomId = `${waitingPlayer.id}-${socket.id}`;
        const chess = new Chess();

        games[roomId] = {
            chess,
            players: {
                w: waitingPlayer.id,
                b: socket.id
            },
            timers: {
                w: TIMER_DURATION,
                b: TIMER_DURATION
            },
            lastMoveTime: Date.now(),
            currentTurn: 'w'
        };

        waitingPlayer.join(roomId);
        socket.join(roomId);

        io.to(waitingPlayer.id).emit("playerRole", { role: "w", roomId });
        io.to(socket.id).emit("playerRole", { role: "b", roomId });

        io.to(roomId).emit("gameStart");

        waitingPlayer = null;
    }

    socket.on("move", ({ move, roomId }) => {
        const game = games[roomId];
        if (!game) return;

        const { chess, players } = game;

        if ((chess.turn() === "w" && socket.id !== players.w) ||
            (chess.turn() === "b" && socket.id !== players.b)) return;

        try {
            const legalMoves = chess.moves({ verbose: true }).map(m => m.from + m.to);
            const attempted = move.from + move.to;

            if (!legalMoves.includes(attempted)) {
                socket.emit("invalidMove");
                return;
            }

            updateTimers(roomId); // update time

            const result = chess.move(move);
            if (result) {
                game.currentTurn = chess.turn();
                io.to(roomId).emit("move", move);
                io.to(roomId).emit("boardState", chess.fen());

                if (chess.isGameOver()) {
                    let info = {};
                    if (chess.isCheckmate()) {
                        info.reason = "checkmate";
                        info.result = chess.turn() === "w" ? "b" : "w";
                    } else {
                        info.reason = "draw";
                        info.result = "draw";
                    }
                    io.to(roomId).emit("gameOver", info);
                    delete games[roomId];
                }
            } else {
                socket.emit("invalidMove");
            }
        } catch (err) {
            socket.emit("invalidMove");
        }
    });

    socket.on("disconnect", () => {
        if (waitingPlayer && waitingPlayer.id === socket.id) {
            waitingPlayer = null;
            return;
        }

        for (let roomId in games) {
            const game = games[roomId];
            const { w, b } = game.players;

            if (socket.id === w || socket.id === b) {
                const winnerSocket = socket.id === w ? b : w;
                const winnerRole = socket.id === w ? "b" : "w";

                if (winnerSocket) {
                    io.to(winnerSocket).emit("gameOver", {
                        result: winnerRole,
                        reason: "opponent_left"
                    });
                }

                delete games[roomId];
                break;
            }
        }
    });
});
app.get('/end', (req, res) => {
    const { result, reason, player } = req.query;
    res.render('end', { result, reason, player });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});