import WebSocket from 'ws';

// Log console check si la connexion WebSocket fonctionne

const ws = new WebSocket('ws://localhost:3002/bombparty/ws');

ws.on('open', () => {
    console.log('🔌 Connexion WebSocket établie');
    ws.send(JSON.stringify({
        event: 'bp:auth',
        payload: { playerName: 'TestPlayer' }
    }));
});

ws.on('message', (data) => {
    const message = JSON.parse(data.toString());
    console.log('📨 Message reçu:', message);
    if (message.event === 'bp:auth:success') {
        console.log('✅ Authentification réussie');
        ws.send(JSON.stringify({
            event: 'bp:lobby:create',
            payload: {
                name: 'Test Lobby',
                isPrivate: false
            }
        }));
    }
    if (message.event === 'bp:lobby:created') {
        console.log('✅ Lobby créé:', message.payload);
        ws.close();
    }
});

ws.on('error', (error) => {
    console.error('❌ Erreur WebSocket:', error);
});

ws.on('close', () => {
    console.log('🔌 Connexion fermée');
});
