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

// Zoom level (set to 5%)
const zoomLevel = 1.0;  // 5% zoom

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

    if (moving.up) newY -= 5;
    if (moving.down) newY += 5;
    if (moving.left) newX -= 5;
    if (moving.right) newX += 5;

    // Update player position
    players[playerId] = { x: newX, y: newY };
    socket.emit('move', { x: newX, y: newY });

    // Center the player by adjusting offsets
    offsetX = newX - canvas.width / 2;
    offsetY = newY - canvas.height / 2;
  }
}

function gameLoop() {
  // Clear the previous frame and reset the transformation
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Apply zoom transformation
  ctx.scale(zoomLevel, zoomLevel);

  // Calculate the offset based on the player's position to center them
  const player = players[playerId];
  const offsetX = canvas.width / 2 - player.x;
  const offsetY = canvas.height / 2 - player.y;

  // Move the context to follow the player
  ctx.translate(offsetX, offsetY);

  // Draw environment objects
  environment.forEach(obj => {
    if (obj.type === 'rock') {
      ctx.drawImage(rockImage, obj.x, obj.y, obj.size, obj.size); // Use dynamic size
    } else if (obj.type === 'grass') {
      ctx.drawImage(grassImage, obj.x, obj.y, obj.size, obj.size); // Use dynamic size
    } else if (obj.type === 'tree') {
      const treeImage = treeImages[obj.imageIndex];  // Use assigned tree image
      ctx.drawImage(treeImage, obj.x, obj.y, obj.size, obj.size); // Use dynamic size
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


// Listen for updates from the server
socket.on('init', (initialPlayers) => {
  for (const id in initialPlayers) {
    players[id] = initialPlayers[id];
  }
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

// Listen for environment data from the server
socket.on('environment', (envObjects) => {
  environment = envObjects;  // Store the environment objects
  gameLoop(); // Start the game loop
});

// Send the screen size to the server
socket.on('connect', () => {
  playerId = socket.id; // Set the player's unique ID
  
  // Send the screen size to the server for environment generation
  socket.emit('screenSize', {
    width: window.innerWidth,
    height: window.innerHeight
  });
});


// Capture player movement on the client
socket.on('connect', () => {
  playerId = socket.id; // Set the player's unique ID
});

// Keep updating position at a consistent rate
setInterval(updatePosition, 1000 / 60); // 60 FPS
