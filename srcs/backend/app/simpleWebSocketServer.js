import { WebSocketServer } from 'ws';
import { createServer } from 'http';

// Créer un serveur HTTP
const server = createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // Route de test
    if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ hello: "from websocket server" }));
        return;
    }
    
    // Route pour les autres requêtes
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: "Not found" }));
});

// Créer le serveur WebSocket
const wss = new WebSocketServer({ 
    server,
    path: '/bombparty/ws'
});

wss.on('connection', (ws, req) => {
    console.log('🔌 [BombParty] Nouvelle connexion WebSocket');
    
    // Envoyer un message de bienvenue
    ws.send(JSON.stringify({
        type: 'welcome',
        message: 'Connexion WebSocket établie avec succès!'
    }));
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('📨 [BombParty] Message reçu:', data);
            
            // Répondre avec un message de test
            ws.send(JSON.stringify({
                type: 'test',
                message: 'Message reçu et traité!',
                originalData: data
            }));
        } catch (error) {
            console.error('❌ [BombParty] Erreur parsing message:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Erreur lors du parsing du message'
            }));
        }
    });

    ws.on('close', () => {
        console.log('🔌 [BombParty] Connexion WebSocket fermée');
    });

    ws.on('error', (error) => {
        console.error('❌ [BombParty] Erreur WebSocket:', error);
    });
});

// Démarrer le serveur
const PORT = 3002;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur WebSocket démarré sur http://localhost:${PORT}`);
    console.log(`🔌 WebSocket disponible sur ws://localhost:${PORT}/bombparty/ws`);
});
