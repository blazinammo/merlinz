const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const seedrandom = require('seedrandom');  // Consistent world generation from a seed

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const clients = new Map();
const players = {};
const worldWidth = 10000;
const worldHeight = 10000;

// Store world seeds to ensure persistence
const worldSeeds = {};
let environment = {};  // This stores the environment for each world

// Ensure that world name is always valid (e.g., replace spaces with underscores)
function sanitizeWorldName(worldName) {
    return worldName.replace(/[^a-zA-Z0-9]/g, '_');
}

app.use(express.static(path.join(__dirname, 'public')));

app.get('/:worldName', (req, res) => {
    const worldName = sanitizeWorldName(req.params.worldName);  // Get world name from URL
    
    // Check if the world already has a seed
    if (!worldSeeds[worldName]) {
        // Generate a new seed for the world if it doesn't exist
        worldSeeds[worldName] = worldName;  // Here we use worldName itself as the seed, you could also generate a random seed.
    }
    
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

wss.on('connection', (ws, req) => {
    const urlPath = req.url.split('/')[1];  // Get world name from URL
    const worldName = sanitizeWorldName(urlPath);  // Sanitize world name
    
    // Check if the world exists, if not, reject the connection
    if (!worldName || !worldSeeds[worldName]) {
        console.error("World name is not specified in the URL or is invalid.");
        ws.close();  // Close the WebSocket connection
        return;
    }
    
    const seed = worldSeeds[worldName];  // Use the world seed from the worldSeeds map

    // Ensure the environment is generated once per world
    if (!environment[seed]) {
        environment[seed] = generateEnvironment(seed);
    }

    const id = generateUniqueId();
    clients.set(ws, id);

    // Select a random object to spawn near
    const randomObject = environment[seed].objects[Math.floor(Math.random() * environment[seed].objects.length)];
    
    let spawnX = randomObject.x + Math.floor(Math.random() * 500);  // Random offset
    let spawnY = randomObject.y + Math.floor(Math.random() * 500);
    
    spawnX = Math.max(0, Math.min(worldWidth, spawnX));  // Ensure spawn within bounds
    spawnY = Math.max(0, Math.min(worldHeight, spawnY));

    players[id] = { x: spawnX, y: spawnY, img: 'wizard1.png' };

    // Send the initialization message
    ws.send(JSON.stringify({ type: 'init_ack', id: id, seed: seed }));

    // Handle player movement and other actions
    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === 'move' && players[id]) {
            players[id].x = data.x;
            players[id].y = data.y;
            broadcastPlayers(seed);  // Broadcast to all players in the same world
        }
    });

    ws.on('close', () => {
        clients.delete(ws);
        delete players[id];
        broadcastPlayers(seed);  // Broadcast to all players in the same world
    });
});



function broadcastPlayers(seed) {
    const message = JSON.stringify({
        type: 'update',
        players: players,
        environment: environment[seed] || []  // Ensure the environment is fetched using the seed
    });

    console.log("Sending environment for seed:", seed);  // Log to check if environment is sent correctly

    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

function generateEnvironment(worldSeed) {
    const rng = seedrandom(worldSeed);
    const objects = [];
    const numObjects = 2000;  // Total number of objects to be generated
    const numRocks = Math.floor(numObjects * 0.1);
    const numTrees = Math.floor(numObjects * 0.4);
    const numGrass = numObjects - numRocks - numTrees;

    // Generate black rectangles and store them
    const numRectangles = Math.floor(rng() * (10 - 6 + 1)) + 6;
    const rectangles = [];
    for (let i = 0; i < numRectangles; i++) {
        const rectWidth = Math.floor(rng() * (2000 - 1000 + 1)) + 1000;
        const rectHeight = Math.floor(rng() * (3000 - 1500 + 1)) + 1500;
        const rectX = Math.floor(rng() * (worldWidth - rectWidth));
        const rectY = Math.floor(rng() * (worldHeight - rectHeight));

        const rectangle = {
            type: 'black_rectangle',
            x: rectX,
            y: rectY,
            width: rectWidth,
            height: rectHeight,
            img: 'black_rectangle.png'
        };

        rectangles.push(rectangle);
        objects.push(rectangle);
    }

    // Function to check if a point is inside any rectangle
    function isPointInRectangles(x, y) {
        return rectangles.some(rect => x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height);
    }

    // Generate rocks
    for (let i = 0; i < numRocks; i++) {
        objects.push({
            type: 'rock',
            x: rng() * worldWidth,
            y: rng() * worldHeight,
            img: 'rock.png'
        });
    }

    // Generate trees with random sizes between 7% to 11% of the screen width
    for (let i = 0; i < numTrees; i++) {
        let treeImage = 'tree' + (Math.floor(rng() * 5) + 1) + '.png';
        
        // Random tree size between 7% and 11% of the screen width
        const treeSizePercentage = rng() * (0.07 - 0.05) + 0.05;  // Between 7% to 11%
        
        // Scale tree size based on screen width (you can scale relative to canvas width here)
        const treeSize = treeSizePercentage * worldWidth; // Or scale relative to player size if needed

        let treeX, treeY;

        // Ensure trees are not placed on black rectangles
        do {
            treeX = rng() * worldWidth;
            treeY = rng() * worldHeight;
        } while (isPointInRectangles(treeX, treeY));

        objects.push({
            type: 'tree',
            x: treeX,
            y: treeY,
            img: treeImage,
            size: treeSize  // Store the size for client-side rendering
        });
    }

    // Generate grass
    for (let i = 0; i < numGrass; i++) {
        objects.push({
            type: 'grass',
            x: rng() * worldWidth,
            y: rng() * worldHeight,
            img: 'grass.png'
        });
    }

    // Return the environment objects and black rectangles for spawn logic
    return { objects, rectangles };
}


function generateUniqueId() {
    return 'player-' + Math.random().toString(36).substr(2, 9);
}

server.listen(8080, () => {
    console.log('Server is listening on port 8080');
});