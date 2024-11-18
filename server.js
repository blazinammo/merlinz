const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const seedrandom = require('seedrandom');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const clients = new Map();
const players = {};
const worldWidth = 10000;
const worldHeight = 10000;

const worldSeeds = {};
let environment = {}; 

function sanitizeWorldName(worldName) {
    return worldName.replace(/[^a-zA-Z0-9]/g, '_');
}

app.use(express.static(path.join(__dirname, 'public')));

app.get('/:worldName', (req, res) => {
    const worldName = sanitizeWorldName(req.params.worldName);
    
    if (!worldSeeds[worldName]) {
        worldSeeds[worldName] = worldName;
    }
    
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

wss.on('connection', (ws, req) => {
    const urlPath = req.url.split('/')[1];
    const worldName = sanitizeWorldName(urlPath);
    
    if (!worldName || !worldSeeds[worldName]) {
        console.error("World name is not specified or invalid.");
        ws.close();
        return;
    }
    
    const seed = worldSeeds[worldName];
    
    if (!environment[seed]) {
        environment[seed] = generateEnvironment(seed);
    }

    const id = generateUniqueId();
    clients.set(ws, id);
    players[id] = { id, x: Math.random() * worldWidth, y: Math.random() * worldHeight, movementDirection: null };

    ws.send(JSON.stringify({
        type: 'init_ack',
        id,
        seed,
        players,
        environment: environment[seed]
    }));

    broadcast({
        type: 'update',
        players
    });

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === 'move') {
            const player = players[id];
            if (player) {
                player.x = data.x;
                player.y = data.y;
                player.movementDirection = data.direction;
            }

            broadcast({
                type: 'update',
                players: { [id]: player }
            });
        }
    });

    ws.on('close', () => {
        clients.delete(ws);
        delete players[id];

        broadcast({
            type: 'update',
            players
        });
    });
});

function broadcast(data) {
    clients.forEach((id, client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

function generateUniqueId() {
    return 'id-' + Math.random().toString(36).substr(2, 9);
}

function generateEnvironment(seed) {
    const rng = seedrandom(seed);
    const objects = [];
    for (let i = 0; i < 50; i++) {
        objects.push({
            type: 'tree',
            x: rng() * worldWidth,
            y: rng() * worldHeight,
            img: 'tree' + (Math.floor(rng() * 5) + 1) + '.png',
            size: 100 + rng() * 100
        });
    }
    return { objects };
}

server.listen(process.env.PORT || 3000, () => {
    console.log(`Server is running on port ${process.env.PORT || 3000}`);
});
