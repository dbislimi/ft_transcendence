# Bomb Party Backend Module

07/10/2025 - TO FIX - (a delete une fois fait) : 
  - bonus bomb-party a ameliorer
  - fix la socket pong et bomb-party (noter a commande pkill le processus)
  - finir le multilingue et fix certain bouton (home, bombparty rule, bombparty bouton, pong set bouton, store)
  - 

Module backend complet pour le jeu Bomb Party, déporté depuis le frontend avec support WebSocket, validation et persistance.

## Architecture

```
srcs/backend/app/src/modules/bombparty/
├── GameEngine.ts          # Moteur de jeu principal
├── RoomManager.ts         # Gestion des lobbies et salles
├── wsHandlers.ts          # Handlers WebSocket Fastify
├── validation.ts          # Schémas de validation des messages
├── database.ts            # Persistance SQLite
├── validator.ts           # Validation des mots avec dictionnaire
├── trigramSelector.ts     # Sélection aléatoire de trigrammes
├── data/
│   └── trigram_words.json # Dictionnaire trigrammes -> mots
└── README.md
```

## Protocole WebSocket

### Endpoint
```
ws://localhost:3000/bombparty/ws
```

### Authentification
Avant tout autre message, le client doit s'authentifier :

```json
{
  "event": "bp:auth",
  "payload": {
    "playerName": "string"
  }
}
```

Réponse :
```json
{
  "event": "bp:auth:success",
  "payload": {
    "playerId": "string",
    "playerName": "string"
  }
}
```

### Messages Client → Serveur

#### Créer un lobby
```json
{
  "event": "bp:lobby:create",
  "payload": {
    "name": "string",           // Nom du lobby (1-50 chars)
    "isPrivate": boolean,       // Lobby privé ou public
    "password": "string",       // Optionnel si privé
    "maxPlayers": number        // Optionnel, défaut: 6, range: 2-8
  }
}
```

#### Rejoindre un lobby
```json
{
  "event": "bp:lobby:join",
  "payload": {
    "roomId": "string",         // ID du lobby
    "password": "string"        // Optionnel si lobby privé
  }
}
```

#### Démarrer une partie
```json
{
  "event": "bp:lobby:start",
  "payload": {
    "roomId": "string"
  }
}
```

#### Soumettre un mot
```json
{
  "event": "bp:game:input",
  "payload": {
    "roomId": "string",
    "word": "string",           // Mot proposé (1-50 chars)
    "msTaken": number           // Temps pris en millisecondes (0-60000)
  }
}
```

#### Activer un bonus
```json
{
  "event": "bp:bonus:activate",
  "payload": {
    "roomId": "string",
    "bonusKey": "inversion" | "plus5sec" | "vitesseEclair" | "doubleChance" | "extraLife"
  }
}
```

### Messages Serveur → Client

#### Lobby créé
```json
{
  "event": "bp:lobby:created",
  "payload": {
    "roomId": "string",
    "playerId": "string"
  }
}
```

#### Lobby rejoint
```json
{
  "event": "bp:lobby:joined",
  "payload": {
    "roomId": "string",
    "playerId": "string",
    "players": [
      {
        "id": "string",
        "name": "string"
      }
    ]
  }
}
```

#### Erreur lobby
```json
{
  "event": "bp:lobby:error",
  "payload": {
    "error": "string",
    "code": "ROOM_NOT_FOUND" | "ROOM_FULL" | "WRONG_PASSWORD" | "ALREADY_IN_ROOM"
  }
}
```

#### État du jeu
```json
{
  "event": "bp:game:state",
  "payload": {
    "roomId": "string",
    "gameState": {
      "phase": "LOBBY" | "COUNTDOWN" | "TURN_ACTIVE" | "RESOLVE" | "GAME_OVER",
      "players": [
        {
          "id": "string",
          "name": "string",
          "lives": number,
          "isEliminated": boolean,
          "streak": number,
          "bonuses": {
            "inversion": number,
            "plus5sec": number,
            "vitesseEclair": number,
            "doubleChance": number,
            "extraLife": number
          },
          "pendingEffects": {
            "vitesseEclair": boolean,
            "doubleChance": boolean
          }
        }
      ],
      "currentPlayerIndex": number,
      "currentTrigram": "string",
      "usedWords": ["string"],
      "turnEndsAt": number,
      "turnOrder": ["string"],
      "turnDirection": 1 | -1,
      "baseTurnSeconds": number,
      "activeTurnEndsAt": number,
      "pendingFastForNextPlayerId": "string",
      "history": [
        {
          "playerId": "string",
          "word": "string",
          "ok": boolean,
          "msTaken": number
        }
      ]
    }
  }
}
```

#### Fin de partie
```json
{
  "event": "bp:game:end",
  "payload": {
    "roomId": "string",
    "winner": {
      "id": "string",
      "name": "string",
      // ... autres propriétés du joueur
    },
    "reason": "VICTORY" | "DISCONNECTION",
    "finalStats": [
      {
        "playerId": "string",
        "wordsSubmitted": number,
        "validWords": number,
        "maxStreak": number
      }
    ]
  }
}
```

#### Bonus appliqué
```json
{
  "event": "bp:bonus:applied",
  "payload": {
    "roomId": "string",
    "playerId": "string",
    "bonusKey": "string",
    "appliedAt": number,
    "meta": {}                  // Données spécifiques au bonus
  }
}
```

## Règles du jeu

### Objectif
Être le dernier joueur en vie en trouvant des mots contenant le trigramme donné.

### Mécaniques
- Chaque joueur commence avec 3 vies par défaut
- Un nouveau trigramme est généré à chaque tour
- Temps limite par défaut : 15 secondes
- Échec = perte d'une vie
- 0 vie = élimination

### Bonus
Obtenus tous les 3 mots valides consécutifs :
- **Inversion** : Inverse l'ordre de jeu
- **Plus 5 sec** : Ajoute 5 secondes au tour actuel
- **Vitesse éclair** : Le prochain joueur n'a que 3 secondes
- **Double chance** : Une chance supplémentaire au prochain échec
- **Vie supplémentaire** : +1 vie (max 9)

## Base de données

### Tables

#### `bp_matches`
```sql
CREATE TABLE bp_matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME,
  ended_at DATETIME,
  winner_id TEXT,
  total_rounds INTEGER DEFAULT 0,
  final_state TEXT                -- JSON de l'état final
);
```

#### `bp_participants`
```sql
CREATE TABLE bp_participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER NOT NULL,
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  words_submitted INTEGER DEFAULT 0,
  valid_words INTEGER DEFAULT 0,
  max_streak INTEGER DEFAULT 0,
  final_lives INTEGER DEFAULT 0,
  is_eliminated BOOLEAN DEFAULT 0,
  FOREIGN KEY (match_id) REFERENCES bp_matches (id)
);
```

## Configuration

### Constantes
```typescript
export const STREAK_FOR_BONUS = 3;           // Mots pour obtenir un bonus
export const DEFAULT_LIVES = 3;              // Vies par défaut
export const DEFAULT_TURN_DURATION = 15000;  // 15 secondes
export const FAST_TURN_DURATION = 3000;      // 3 secondes (vitesse éclair)
```

### Limites de validation
- Nom de joueur : 1-30 caractères
- Nom de lobby : 1-50 caractères
- Mot : 1-50 caractères, lettres + tirets
- Mot de passe : 1-100 caractères
- Joueurs par lobby : 2-8
- Temps de soumission : 0-60000ms

## Utilisation

### Backend
```typescript
// Dans server.ts
import bombPartyWSHandlers from "./modules/bombparty/wsHandlers.ts";

fastify.register(websocket);
fastify.register(bombPartyWSHandlers);
```

### Frontend
```typescript
import { BombPartyClient } from './services/ws/bombPartyClient';

// Mode réel (production)
const client = new BombPartyClient({ 
  mock: false,
  wsUrl: 'ws://localhost:3000/bombparty/ws'
});

// Mode mock (développement)
const client = new BombPartyClient({ mock: true });

// Authentification
client.authenticate('MonNom');

// Écouter les événements
client.on('lobby:created', (payload) => {
  console.log('Lobby créé:', payload);
});

// Créer un lobby
client.createLobby('Ma partie', false);

// Basculer entre modes
client.setMockMode(false); // Passer en mode réel
```

## Développement

### Tests
Le module inclut un mode mock complet permettant de tester l'UI sans backend actif.

### Debug
Tous les logs utilisent le préfixe `[BombParty]` avec des emojis pour faciliter le debug :
- 🎮 Événements de jeu
- 🔌 Connexions WebSocket
- 📨 Messages
- ✅ Succès
- ❌ Erreurs
- ⚠️ Avertissements

### Maintenance
La base de données inclut une méthode `cleanupOldMatches()` pour supprimer les anciennes parties.

## Types partagés

Les types sont définis dans `srcs/shared/bombparty/types.ts` et partagés entre frontend et backend via des liens symboliques.

## Sécurité

- Validation stricte de tous les messages entrants
- Sanitisation des chaînes de caractères
- Limitation des taux de reconnexion
- Protection contre les injections SQL (requêtes paramétrées)
- Gestion des déconnexions et timeouts

## Performance

- Reconnexion automatique avec backoff exponentiel
- Index de base de données pour les requêtes fréquentes
- Nettoyage automatique des ressources
- Broadcasting optimisé par salle
