# ft_transcendence

Full-stack multiplayer platform with real-time Pong, Bomb Party, chat, and friends system. Everything runs over WebSocket, game logic is server-authoritative.

## Quick Start

Requires Docker and Make.

```bash
make
make dev        # dev mode with hot reload + Adminer on http://localhost:8080
make down       # stop containers
```

Site available at `https://localhost:8443`. For Google OAuth, edit `srcs/.env`:

```
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

## Architecture

Three containers: Nginx (reverse proxy, SSL termination, WebSocket upgrade), Fastify backend, React frontend.

```
                 Client (Browser)
                        |
                    HTTPS :8443
                        |
                 ┌──────┴──────┐
                 │    Nginx    │
                 │  (SSL/TLS)  │
                 └──────┬──────┘
                        |
              ┌─────────┴─────────┐
              |                   |
        /api/* + WS              /*
              |                   |
     ┌────────┴────────┐   ┌─────┴───────┐
     │    Backend      │   │  Frontend   │
     │ Fastify :3001   │   │ React/Vite  │
     │ REST + WebSocket│   │   :4173     │
     └────────┬────────┘   └─────────────┘
              |
        ┌─────┴─────┐
        │  SQLite   │
        └───────────┘
```

## Backend (Fastify + TypeScript)

The API uses Fastify plugins, each handling a domain: `auth.ts` (registration/login/JWT), `google.ts` (OAuth2), `2fa.ts` (two-factor), `ws-friends.ts` (friend list + online status), `chat.ts` (messaging), `gameController.ts` (game sessions), `matchHistory.ts` (results). Data stored in SQLite.

**Pong** - Server-authoritative game loop in `src/pong/`. `GamesManager.ts` does matchmaking, `Game.ts` runs the physics, `Bot.ts` has three difficulty levels with pre-trained Q-learning data in `data/AI/`. `Tournament.ts` handles brackets, `Bonus.ts` spawns in-game items. Stats charts are rendered server-side with Chart.js + `@napi-rs/canvas`.

**Bomb Party** - Word game in `src/modules/bombparty/`. The `engine/` directory splits logic into phases, turns, rules, and state management. `RoomManager.ts` supports multiple concurrent rooms. Players have to find words containing a given syllable before a timer runs out. Syllables come from French and English dictionaries.

## Frontend (React + Vite + Tailwind)

Single-Page application with React Router. State is split between Zustand stores and React contexts (user, WebSocket, friends, game, notifications, settings). PixiJS for the animated background, i18next for translations.

## WebSocket endpoints

| Endpoint        | Purpose                         |
| :-------------- | :------------------------------ |
| `/game`         | Pong state (positions, scores)  |
| `/bombparty/ws` | Bomb Party turns, words, scores |
| `/chat`         | Messaging                       |
| `/ws-friends`   | Online status, friend requests  |

## Make commands

| Command       | Description                       |
| :------------ | :-------------------------------- |
| `make`        | Production build + launch         |
| `make dev`    | Dev mode with hot reload          |
| `make down`   | Stop containers                   |
| `make status` | Show containers, networks, images |
| `make clean`  | Remove containers, images, certs  |
| `make re`     | Full clean + rebuild              |
| `make certs`  | Generate SSL certs only           |

## Structure

```
Makefile
srcs/
  .env.example
  generate_certs.sh
  docker-compose.yml           - production
  docker-compose.dev.yml       - dev (+ Adminer)
  nginx/
    nginx.conf                 - reverse proxy config
  backend/
    app/src/
      server.ts                - Fastify entry point
      plugins/                 - auth, chat, friends, games, settings
      pong/                    - Pong engine
      modules/bombparty/       - Bomb Party engine
  frontend/
    app/src/
      main.tsx                 - React entry point
      pages/                   - app pages
      Components/              - UI components
      contexts/                - React contexts
      pong/                    - Pong rendering (Canvas)
      game-bomb-party/         - Bomb Party UI
      locales/                 - i18n
```
