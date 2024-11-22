const socket = io();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const wizardImage = new Image();
wizardImage.src = 'wizard.png'; // Path to your wizard image
const players = {};
let playerId = null;

// Canvas size
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Game loop for smooth rendering and interpolation
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw all players
  for (const id in players) {
    const player = players[id];
    ctx.drawImage(wizardImage, player.x - 25, player.y - 25, 50, 50);
  }

  requestAnimationFrame(gameLoop);
}

// Handle movement keys
let moving = { up: false, down: false, left: false, right: false };

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

// Update position based on movement
function updatePosition() {
  if (playerId) {
    let newX = players[playerId].x;
    let newY = players[playerId].y;

    if (moving.up) newY -= 5;
    if (moving.down) newY += 5;
    if (moving.left) newX -= 5;
    if (moving.right) newX += 5;

    // Send the new position to the server
    socket.emit('move', { x: newX, y: newY });
  }
}

// Listen for updates from the server
socket.on('init', (initialPlayers) => {
  for (const id in initialPlayers) {
    players[id] = initialPlayers[id];
  }
  gameLoop(); // Start the game loop
});

socket.on('newPlayer', (data) => {
  players[data.playerId] = { x: data.x, y: data.y };
});

socket.on('playerMove', (data) => {
  players[data.playerId] = { x: data.x, y: data.y };
});

socket.on('removePlayer', (playerId) => {
  delete players[playerId];
});

// Capture player movement on the client
socket.on('connect', () => {
  playerId = socket.id; // Set the player's unique ID
  players[playerId] = { x: canvas.width / 2, y: canvas.height / 2 }; // Start in the center
});

// Keep updating position at a consistent rate
setInterval(updatePosition, 1000 / 60); // 60 FPS
