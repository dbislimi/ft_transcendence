# Guide de mise en place du Remote pour les PC de 42

## 📋 Vue d'ensemble

Ce guide explique comment remplacer tous les `localhost` par le hostname de la machine pour permettre l'accès remote sur les PC de 42.

## 🔍 Liste complète des occurrences de `localhost`

### Frontend (27 occurrences)

#### Fichiers avec `localhost` hardcodé dans les URLs :

1. **srcs/frontend/app/src/Components/AccountSettingsModal.tsx** (ligne 59)
   - `'https://localhost/api/me'`

2. **srcs/frontend/app/src/Components/GoogleAuthButton.tsx** (ligne 11)
   - `"https://localhost/api"`

3. **srcs/frontend/app/src/Components/AuthentificationForm.tsx** (ligne 46)
   - `'https://localhost/api/register'`

4. **srcs/frontend/app/src/pages/Registr.tsx** (ligne 10)
   - `'https://localhost/api/register'`

5. **srcs/frontend/app/src/pages/chat.tsx** (ligne 23)
   - `` `wss://localhost/${endpoint}?token=${token}` ``

6. **srcs/frontend/app/src/pages/Dashboard.tsx** (ligne 16)
   - `"https://localhost/api/profile"`

7. **srcs/frontend/app/src/pages/Friends.tsx** (9 occurrences)
   - Ligne 44: `"https://localhost/api/friends"`
   - Ligne 58: `"https://localhost/api/friend-requests"`
   - Ligne 72: `"https://localhost/api/blocked-users"`
   - Ligne 87: `` `wss://localhost/ws-friends?token=${token}` ``
   - Ligne 147: `"https://localhost/api/friend-requests"`
   - Ligne 160: `` `https://localhost/api/friend-requests/${senderId}/accept` ``
   - Ligne 167: `` `https://localhost/api/friend-requests/${senderId}/reject` ``
   - Ligne 175: `` `https://localhost/api/friends/${friendId}` ``
   - Ligne 183: `"https://localhost/api/block-user"`
   - Ligne 191: `` `https://localhost/api/blocked-users/${userId}` ``

8. **srcs/frontend/app/src/fetchData.ts** (ligne 9)
   - `` 'https://localhost/api/' + api ``

9. **srcs/frontend/app/src/services/bombPartyStatsService.ts** (ligne 20)
   - `'https://localhost/api/bomb-party'`

10. **srcs/frontend/app/src/api/player.ts** (ligne 4)
    - `` `https://localhost/api/user/${userId}` ``

11. **srcs/frontend/app/src/hook/usePlayerProfile.ts** (ligne 22)
    - `` `https://localhost/api/user/${userId}` ``

12. **srcs/frontend/app/src/contexts/UserContext.tsx** (ligne 41)
    - `"https://localhost/api/friends"`

#### Fichiers avec `localhost` dans la logique WebSocket (à remplacer par variable) :

13. **srcs/frontend/app/src/services/bombPartyService.ts** (ligne 262)
    - `const wsHost = isVitePort ? 'localhost' : window.location.host;`

14. **srcs/frontend/app/src/services/ws/bombPartyClient.ts** (ligne 126)
    - `const wsHost = isVitePort ? 'localhost' : window.location.host;`

15. **srcs/frontend/app/src/contexts/WebSocketContext.tsx** (ligne 53)
    - `const wsHost = isVitePort ? 'localhost' : window.location.host;`

16. **srcs/frontend/app/src/Components/ChatWidget.tsx** (ligne 45)
    - `const wsHost = isVitePort ? 'localhost' : window.location.host;`

17. **srcs/frontend/app/src/hooks/useGameWebsocket.ts** (ligne 37)
    - `const wsHost = isVitePort ? 'localhost' : window.location.host;`

18. **srcs/frontend/app/vite.config.ts** (ligne 72)
    - `target: 'wss://localhost:3001'`

19. **srcs/frontend/app/src/contexts/AuthContext.tsx** (ligne 179 - commenté)
    - `// navigator.sendBeacon('https://localhost:3001/logout', blob);`

### Backend (6 occurrences)

1. **srcs/backend/app/src/server.ts** (ligne 45)
   - `origin: ["https://localhost:5173", "https://localhost"]`

2. **srcs/backend/app/src/plugins/google.ts** (3 occurrences)
   - Ligne 23: `callbackUri: 'http://localhost:3001/auth/google/callback'`
   - Ligne 85: `` `http://localhost:5173?require2fa=${user.twoFAEnabled}` ``
   - Ligne 93: `` `http://localhost:5173?token=${jwtToken}` ``

3. **srcs/backend/app/src/plugins/websockets.ts** (ligne 64)
   - `` const fake = `http://localhost${req.url}`; ``

4. **srcs/backend/app/src/modules/bombparty/wsHandlers.ts** (ligne 65)
   - `` const url = new URL(`http://localhost${request.url}`); ``

### Nginx (2 occurrences)

1. **srcs/nginx/nginx.conf** (lignes 40 et 189)
   - `server_name localhost;` (2 fois)

### Scripts (1 occurrence)

1. **srcs/generate_certs.sh** (ligne 15)
   - `CN=localhost` (dans le sujet du certificat SSL)

---

## 🚀 Étapes de mise en place

### Étape 1 : Récupérer le hostname

```bash
hostname
```

Notez le hostname retourné (ex: `c1r1s1`, `c2r2s3`, etc.)

### Étape 2 : Créer le fichier `.env` à la racine de `srcs/`

```bash
cd srcs
echo "HOSTNAME=$(hostname)" > .env
```

Ou manuellement, créez `srcs/.env` :
```env
HOSTNAME=votre-hostname-42
```

### Étape 3 : Modifier `docker-compose.yml`

Ajoutez les variables d'environnement pour chaque service :

```yaml
services:
  nginx:
    # ... existing code ...
    environment:
      - HOSTNAME=${HOSTNAME:-localhost}
    # ... existing code ...

  back:
    # ... existing code ...
    environment:
      - HOSTNAME=${HOSTNAME:-localhost}
    # ... existing code ...

  front:
    # ... existing code ...
    environment:
      - VITE_HOSTNAME=${HOSTNAME:-localhost}
    # ... existing code ...
```

### Étape 4 : Modifier le Dockerfile de nginx

```dockerfile
FROM nginx:alpine

# Install gettext for envsubst
RUN apk add --no-cache gettext

# Copy nginx configuration template
COPY nginx.conf.template /etc/nginx/templates/nginx.conf.template

# Create log directory
RUN mkdir -p /var/log/nginx

# Expose HTTPS port
EXPOSE 443

# Start nginx with envsubst
CMD ["sh", "-c", "envsubst '$$HOSTNAME' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/nginx.conf && nginx -g 'daemon off;'"]
```

### Étape 5 : Créer `nginx.conf.template`

Copiez `nginx.conf` vers `nginx.conf.template` et remplacez les `localhost` :

```nginx
# Ligne 40
server_name ${HOSTNAME};

# Ligne 189
server_name ${HOSTNAME};
```

### Étape 6 : Modifier le backend

#### `srcs/backend/app/src/server.ts`

```typescript
const HOSTNAME = process.env.HOSTNAME || 'localhost';

// Dans la fonction main()
await fastify.register(cors, {
    origin: [`https://${HOSTNAME}:5173`, `https://${HOSTNAME}`],
    // ... existing code ...
});
```

#### `srcs/backend/app/src/plugins/google.ts`

```typescript
const HOSTNAME = process.env.HOSTNAME || 'localhost';

// Ligne 23
callbackUri: `http://${HOSTNAME}:3001/auth/google/callback`,

// Ligne 85
return reply.redirect(`http://${HOSTNAME}:5173?require2fa=${user.twoFAEnabled}`);

// Ligne 93
return reply.redirect(`http://${HOSTNAME}:5173?token=${jwtToken}`);
```

**Note** : Les fichiers `websockets.ts` et `wsHandlers.ts` utilisent `localhost` uniquement pour parser l'URL, pas pour se connecter. Vous pouvez les laisser tel quel ou utiliser une variable si vous préférez.

### Étape 7 : Modifier le frontend

#### Créer/modifier `srcs/frontend/app/src/config/api.ts`

```typescript
// API Configuration
// All API calls should go through nginx reverse proxy

const HOSTNAME = import.meta.env.VITE_HOSTNAME || window.location.hostname;

export const API_BASE_URL = window.location.origin;
export const WS_BASE_URL = window.location.origin.replace('http', 'ws');
export const BACKEND_URL = `https://${HOSTNAME}`;
export const BACKEND_DIRECT_URL = `https://${HOSTNAME}:3001`;
export const BACKEND_WS_DIRECT_URL = `wss://${HOSTNAME}:3001`;

// Pour les WebSockets en mode dev (port 5173)
export const getWebSocketHost = (): string => {
  const isVitePort = window.location.port === '5173';
  return isVitePort ? HOSTNAME : window.location.hostname;
};

export const API_ENDPOINTS = {
    // ... existing code ...
};
```

#### Remplacer tous les `localhost` hardcodés

Dans tous les fichiers listés ci-dessus, remplacez :
- `'https://localhost/api/...'` → `API_BASE_URL + '/api/...'` ou `BACKEND_URL + '/api/...'`
- `'wss://localhost/...'` → `WS_BASE_URL + '/...'`
- `'localhost'` dans les WebSockets → `getWebSocketHost()`

#### `srcs/frontend/app/vite.config.ts`

```typescript
const HOSTNAME = process.env.VITE_HOSTNAME || 'localhost';

// Dans server.proxy
proxy: {
  '/bombparty/ws': {
    target: `wss://${HOSTNAME}:3001`,
    ws: true,
    changeOrigin: true,
    secure: false
  }
}
```

### Étape 8 : Modifier `generate_certs.sh` (optionnel mais recommandé)

```bash
# Ligne 15 - Récupérer le hostname depuis l'environnement ou utiliser localhost par défaut
HOSTNAME=${HOSTNAME:-localhost}
-subj "/C=FR/ST=Nice/L=Nice/O=42/OU=Student/CN=${HOSTNAME}"
```

---

## 📝 Checklist de modification

### Configuration Docker
- [ ] Créer `srcs/.env` avec `HOSTNAME=$(hostname)`
- [ ] Modifier `docker-compose.yml` pour ajouter les variables d'environnement
- [ ] Modifier `nginx/Dockerfile` pour utiliser envsubst
- [ ] Créer `nginx/nginx.conf.template` avec `${HOSTNAME}`

### Backend
- [ ] Modifier `backend/app/src/server.ts`
- [ ] Modifier `backend/app/src/plugins/google.ts`
- [ ] (Optionnel) Modifier `backend/app/src/plugins/websockets.ts`
- [ ] (Optionnel) Modifier `backend/app/src/modules/bombparty/wsHandlers.ts`

### Frontend
- [ ] Modifier `frontend/app/src/config/api.ts`
- [ ] Modifier `frontend/app/vite.config.ts`
- [ ] Remplacer `localhost` dans `Components/AccountSettingsModal.tsx`
- [ ] Remplacer `localhost` dans `Components/GoogleAuthButton.tsx`
- [ ] Remplacer `localhost` dans `Components/AuthentificationForm.tsx`
- [ ] Remplacer `localhost` dans `pages/Registr.tsx`
- [ ] Remplacer `localhost` dans `pages/chat.tsx`
- [ ] Remplacer `localhost` dans `pages/Dashboard.tsx`
- [ ] Remplacer `localhost` dans `pages/Friends.tsx` (9 occurrences)
- [ ] Remplacer `localhost` dans `fetchData.ts`
- [ ] Remplacer `localhost` dans `services/bombPartyStatsService.ts`
- [ ] Remplacer `localhost` dans `api/player.ts`
- [ ] Remplacer `localhost` dans `hook/usePlayerProfile.ts`
- [ ] Remplacer `localhost` dans `contexts/UserContext.tsx`
- [ ] Remplacer `localhost` dans `services/bombPartyService.ts`
- [ ] Remplacer `localhost` dans `services/ws/bombPartyClient.ts`
- [ ] Remplacer `localhost` dans `contexts/WebSocketContext.tsx`
- [ ] Remplacer `localhost` dans `Components/ChatWidget.tsx`
- [ ] Remplacer `localhost` dans `hooks/useGameWebsocket.ts`

### Scripts
- [ ] (Optionnel) Modifier `generate_certs.sh`

---

## 🔄 Commandes de déploiement

```bash
# 1. Récupérer le hostname et créer le .env
cd srcs
echo "HOSTNAME=$(hostname)" > .env
cat .env  # Vérifier

# 2. Régénérer les certificats avec le bon hostname (si nécessaire)
# Modifier generate_certs.sh d'abord, puis :
cd ..
make certs

# 3. Reconstruire et démarrer
make down
make up
```

---

## ⚠️ Notes importantes

1. **Certificats SSL** : Si vous changez le hostname, vous devrez régénérer les certificats SSL avec le nouveau CN (Common Name).

2. **Variables d'environnement Vite** : Les variables d'environnement pour Vite doivent être préfixées par `VITE_` pour être accessibles dans le code frontend via `import.meta.env.VITE_*`.

3. **Nginx et envsubst** : Nginx ne supporte pas nativement les variables d'environnement. On utilise `envsubst` pour remplacer les variables au démarrage du conteneur.

4. **Mode développement vs production** : 
   - En dev (port 5173), utilisez le hostname pour les WebSockets
   - En production (port 443 via nginx), utilisez `window.location.host`

5. **CORS** : Assurez-vous que le backend autorise les requêtes depuis le nouveau hostname.

---

## 🧪 Tests

Après la mise en place, testez :

1. Accès HTTPS : `https://votre-hostname-42/`
2. API : `https://votre-hostname-42/api/health`
3. WebSockets : Vérifier que les connexions WebSocket fonctionnent
4. Authentification Google : Vérifier les callbacks

---

## 📚 Ressources

- [Nginx envsubst](https://nginx.org/en/docs/ngx_core_module.html#env)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Docker Compose Environment Variables](https://docs.docker.com/compose/environment-variables/)
