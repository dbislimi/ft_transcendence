const WebSocket = require('ws');

console.log('🧪 Test de connexion WebSocket...');

const ws = new WebSocket('ws://localhost:3002/bombparty/ws');

ws.on('open', () => {
  console.log('✅ Connexion WebSocket établie');
  
  // Test d'authentification
  const authMessage = {
    event: 'bp:auth',
    payload: {
      playerName: 'TestPlayer'
    }
  };
  
  console.log('📤 Envoi message auth:', authMessage);
  ws.send(JSON.stringify(authMessage));
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log('📨 Message reçu:', message);
  
  if (message.event === 'bp:auth:success') {
    console.log('✅ Authentification réussie !');
    ws.close();
  }
});

ws.on('error', (error) => {
  console.error('❌ Erreur WebSocket:', error);
});

ws.on('close', () => {
  console.log('🔌 Connexion fermée');
});