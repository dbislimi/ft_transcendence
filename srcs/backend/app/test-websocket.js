const WebSocket = require('ws');

console.log('🧪 Test de connexion WebSocket...');

const ws = new WebSocket('ws://localhost:3001/bombparty/ws');

ws.on('open', () => {
  console.log('✅ Connexion WebSocket établie');
  
  // Test d'authentification
  ws.send(JSON.stringify({
    event: 'bp:auth',
    payload: { playerName: 'Test Player' }
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log('📨 Message reçu:', message);
  
  if (message.event === 'bp:auth:success') {
    console.log('✅ Authentification réussie, test de création de lobby...');
    
    // Test de création de lobby
    ws.send(JSON.stringify({
      event: 'bp:lobby:create',
      payload: { 
        name: 'Test Lobby',
        isPrivate: false
      }
    }));
  }
});

ws.on('error', (error) => {
  console.error('❌ Erreur WebSocket:', error);
});

ws.on('close', () => {
  console.log('❌ Connexion WebSocket fermée');
});
