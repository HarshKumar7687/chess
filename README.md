# Chess

Socket.io Initialization:
- Establish WebSocket connection to the server using Socket.io (const socket = io();).

Chess Game Initialization:
- Create an instance of the Chess class from the chess.js library to manage the game logic (const chess = new Chess();).

DOM Elements:
- Select the HTML element with the ID "chessboard" to render the chessboard (const boardElement = document.querySelector("#chessboard");).

Drag and Drop:
- Implement drag and drop functionality for moving chess pieces on the board.
- Pieces are draggable only if it's the player's turn.
- Event listeners for drag start, drag end, drag over, and drop events are attached to handle drag and drop interactions.

Rendering the Board:
- Generate the HTML representation of the chessboard based on the current game state.
- Create piece elements for occupied squares and append them to square elements.
- Iterate over the board array and create square elements for each cell.
- Flip the board for the black player's view.

Handling Moves:
- Construct a move object containing the source and target squares in algebraic notation.
- Handle player moves when dragging and dropping pieces.
- Emit a "move" event to the server via Socket.io.

Unicode Chess Pieces:
- Return Unicode characters representing chess pieces based on their type.
Socket.io Event Handlers:
- Update the local game state and render the board accordingly when receiving events.
- Listen for various events from the server such as player role assignment, spectator role assignment, board state updates, and opponent moves.

Initial Rendering:
- Call the renderBoard function initially to render the initial state of the chessboard.



# SERVER JS CODE

- Import: express, http, socket.io, chess.js

- Create Express app instance
- Initialize HTTP server with Express
- Instantiate Socket.io on HTTP server

- Create Chess object instance (chess.js)

- Initialize:
    - Players object: track socket IDs, roles (white/black)
    - CurrentPlayer: track current turn

- Configure Express app:
    - Use EJS templating engine
    - Serve static files from 'public' directory

- Define route for root URL
- Render EJS template "index"
- Title: "Custom Chess Game"

- Socket.io handles connection event
- Callback executed on client connect
- Server assigns role based on availability:
    - If slots empty:
        - Assign role (white/black)
        - Inform player
    - If slots full:
        - Designate as spectator

- Client connection:
    - Assign role based on game state:
        - If no white player, assign white role
        - If no black player, assign black role
        - Emit "playerRole" event with assigned role
        - If both slots filled, designate as spectator
        - Emit "spectatorRole" event
    - Send initial board state using FEN notation

- Client disconnection:
    - Remove assigned role from players object

- Listen for "move" events:
    - Validate correct player's turn
    - If valid:
        - Update game state
        - Broadcast move via "move" event
        - Send updated board state via "boardState" event
    - If invalid:
        - Log error message

- Ensure smooth gameplay and real-time updates for all connected clients.




This is a multiplayer chess game hosted on render.
Its chooses player randomly.
