const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Store player positions
let players = {};

// Store environment objects
let environment = []; // Declare environment globally

app.use(express.static('public')); // Serve static files like the wizard.png

// Load images for the different object types
const rockImage = 'rock.png';
const grassImage = 'grass.png';
const treeImages = ['tree1.png', 'tree2.png', 'tree3.png', 'tree4.png', 'tree5.png', 'tree6.png'];
const blackRectangleImage = 'black_rectangle.png';

const GAME_WORLD_WIDTH = 10000;
const GAME_WORLD_HEIGHT = 10000;
const numberOfObjects = 1000; // or any number of objects you want to generate

function generateEnvironment(screenWidth, screenHeight) {
  const objects = [];

  for (let i = 0; i < numberOfObjects; i++) {
    const x = Math.random() * GAME_WORLD_WIDTH;
    const y = Math.random() * GAME_WORLD_HEIGHT;
    let type, imageIndex, size;

    const rand = Math.random();

    if (rand < 0.3) {
      type = 'rock';
      size = (Math.random() * 0.25 + 0.5) / 100 * screenWidth; // 0.5-1% of screen width
    } else if (rand < 0.5) {
      type = 'grass';
      size = (Math.random() * 0.5 + 0.75) / 100 * screenWidth; // 0.5-2% of screen width
    } else {
      type = 'tree';
      imageIndex = Math.floor(Math.random() * treeImages.length); // Assign a random image for trees
      size = (Math.random() * 2 + 3.5) / 100 * screenHeight; // 7-11% of screen height
    }

    const obj = { type, x, y, size };

    // Only add imageIndex if the type is a tree
    if (type === 'tree') {
      obj.imageIndex = imageIndex;
    }

    objects.push(obj);
  }
  return objects;
}

// Generate the initial environment once
environment = generateEnvironment(GAME_WORLD_WIDTH, GAME_WORLD_HEIGHT);

// Filter objects based on the player’s viewport
function getVisibleEnvironment(playerX, playerY, viewportWidth, viewportHeight) {
  const margin = 100; // Add margin for objects just outside the viewport
  return environment.filter(obj =>
    obj.x > playerX - viewportWidth / 2 - margin &&
    obj.x < playerX + viewportWidth / 2 + margin &&
    obj.y > playerY - viewportHeight / 2 - margin &&
    obj.y < playerY + viewportHeight / 2 + margin
  );
}

io.on('connection', (socket) => {
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

  // Handle viewport updates from client
  socket.on('updateViewport', (data) => {
    const { x, y, width, height } = data;
    const visibleEnvironment = getVisibleEnvironment(x, y, width, height);
    socket.emit('environment', visibleEnvironment);
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
