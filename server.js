const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Store player positions
let players = {};

app.use(express.static('public')); // Serve static files like the wizard.png

io.on('connection', (socket) => {
  // Assign a new player ID when they connect
  const playerId = socket.id;
  players[playerId] = { x: 0, y: 0 };  // Initial position for each player

  console.log(`Player ${playerId} connected`);

  // Send current players' data to the newly connected player
  socket.emit('init', players);

  // Broadcast new player to all other players
  socket.broadcast.emit('newPlayer', { playerId, x: 0, y: 0 });

  // Handle movement updates from the client
  socket.on('move', (data) => {
    const { x, y } = data;
    players[playerId] = { x, y };

    // Broadcast updated position to all clients
    io.emit('playerMove', { playerId, x, y });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Player ${playerId} disconnected`);
    delete players[playerId];

    // Broadcast player removal
    io.emit('removePlayer', playerId);
  });
});

// Start the server
const port = 3000;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
