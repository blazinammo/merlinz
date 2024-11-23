const socket = io();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Preload images
const wizardImage = new Image();
wizardImage.src = 'wizard.png'; // Path to your wizard image

const rockImage = new Image();
rockImage.src = 'rock.png';

const grassImage = new Image();
grassImage.src = 'grass.png';

const treeImages = [
  new Image(),
  new Image(),
  new Image(),
  new Image(),
  new Image(),
  new Image()
];
treeImages[0].src = 'tree1.png';
treeImages[1].src = 'tree2.png';
treeImages[2].src = 'tree3.png';
treeImages[3].src = 'tree4.png';
treeImages[4].src = 'tree5.png';
treeImages[5].src = 'tree6.png';

const blackRectangleImage = new Image();
blackRectangleImage.src = 'black_rectangle.png';

const players = {};
let playerId = null;
let environment = [];

// Canvas size
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Offset for scrolling
let offsetX = 0;
let offsetY = 0;

// Zoom level (set to 5% zoom)
const zoomLevel = 1.0; 

// Variables to handle movement
let moving = { up: false, down: false, left: false, right: false };

// Handle player movement
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp') moving.up = true;
  if (e.key === 'ArrowDown') moving.down = true;
  if (e.key === 'ArrowLeft') moving.left = true;
  if (e.key === 'ArrowRight') moving.right = true;
});

window.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowUp') moving.up = false;
  if (e.key === 'ArrowDown') moving.down = false;
  if (e.key === 'ArrowLeft') moving.left = false;
  if (e.key === 'ArrowRight') moving.right = false;
});

function updatePosition() {
  if (playerId) {
    let newX = players[playerId].x;
    let newY = players[playerId].y;

    if (moving.up) newY -= 6;
    if (moving.down) newY += 6;
    if (moving.left) newX -= 6;
    if (moving.right) newX += 6;

    // Update player position
    players[playerId] = { x: newX, y: newY };
    socket.emit('move', { x: newX, y: newY });
  }
}

let lastSentX = null;
let lastSentY = null;

function sendViewportUpdate() {
  const player = players[playerId];
  if (player && lastSentX !== null && lastSentY !== null) {
    // Only send update if the player moved
    if (Math.abs(player.x - lastSentX) > 5 || Math.abs(player.y - lastSentY) > 5) {
      socket.emit('updateViewport', {
        x: player.x,
        y: player.y,
        width: canvas.width,
        height: canvas.height
      });
      lastSentX = player.x;
      lastSentY = player.y;
    }
  }
}

window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  sendViewportUpdate();
});

function gameLoop() {
  // Clear the previous frame and reset the transformation
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Apply zoom transformation
  ctx.scale(zoomLevel, zoomLevel);

  // Only proceed if playerId and players[playerId] are defined
  if (playerId && players[playerId]) {
    // Calculate the offset based on the player's position to center them
    const player = players[playerId];
    const playerOffsetX = canvas.width / 2 - player.x;
    const playerOffsetY = canvas.height / 2 - player.y;

    // Move the context to follow the player
    ctx.translate(playerOffsetX, playerOffsetY);
  }

  // Draw environment objects (only the visible ones received from the server)
  environment.forEach(obj => {
    if (obj.type === 'rock') {
      ctx.drawImage(rockImage, obj.x, obj.y, obj.size, obj.size);
    } else if (obj.type === 'grass') {
      ctx.drawImage(grassImage, obj.x, obj.y, obj.size, obj.size);
    } else if (obj.type === 'tree') {
      const treeImage = treeImages[obj.imageIndex];
      ctx.drawImage(treeImage, obj.x, obj.y, obj.size, obj.size);
    } else if (obj.type === 'black_rectangle') {
      ctx.drawImage(blackRectangleImage, obj.x, obj.y, obj.width, obj.height);
    }
  });

  // Draw all players
  for (const id in players) {
    const player = players[id];
    ctx.drawImage(wizardImage, player.x - 25, player.y - 25, 50, 50);
  }

  requestAnimationFrame(gameLoop);
}

// Start the game loop
requestAnimationFrame(gameLoop);

// Handle player initialization
socket.on('init', (serverPlayers) => {
  playerId = socket.id;
  players[playerId] = { x: canvas.width / 2, y: canvas.height / 2 };
  Object.assign(players, serverPlayers);
  
  // Initialize the last sent coordinates after player initialization
  lastSentX = players[playerId].x;
  lastSentY = players[playerId].y;
});

// Handle new player joining
socket.on('newPlayer', (data) => {
  players[data.playerId] = { x: data.x, y: data.y };
});

// Handle player movement
socket.on('playerMove', (data) => {
  if (players[data.playerId]) {
    players[data.playerId].x = data.x;
    players[data.playerId].y = data.y;
  }
});

// Handle player disconnection
socket.on('removePlayer', (id) => {
  delete players[id];
});

// Receive and set environment data
socket.on('environment', (data) => {
  environment = data;
});

// Update player position
setInterval(updatePosition, 16); // Roughly 60 fps
// Update every 100ms to ensure smooth updates as the player moves
setInterval(sendViewportUpdate, 32);
