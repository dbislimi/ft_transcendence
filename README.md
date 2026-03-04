# ft_transcendence

Real-time multiplayer platform — server-authoritative Pong, Bomb Party, chat, and friends, all over WebSocket. Clients send inputs, the server owns the truth, and everything in between is a battle against latency, jitter, and packet reordering across five concurrent real-time channels.

## Quick Start

Requires Docker and Make.

```bash
make            # production — builds everything, generates SSL certs, starts on https://localhost:8443
make dev        # development — hot reload, Adminer on http://localhost:8080
make down       # stop all containers
```

The first `make` generates self-signed SSL certificates, creates `.env` from `.env.example`, detects your local IP, and generates a random `JWT_SECRET`. For Google OAuth, edit `srcs/.env`:

```
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

## How it works

Three Docker containers — Nginx as a reverse proxy handling SSL termination, HTTP/2, and WebSocket upgrades, a Fastify backend, and a React frontend.

**Architecture**

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
        /api/* + WS               |
              |                   |
     ┌────────┴────────┐    ┌─────┴───────┐
     │    Backend      │    │  Frontend   │
     │ Fastify :3001   │    │ React/Vite  │
     │ REST + WebSocket│    │   :4173     │
     └────────┬────────┘    └─────────────┘
              |
        ┌─────┴─────┐
        │  SQLite   │
        └───────────┘
```

**Backend — Fastify + TypeScript**

The API is a set of Fastify plugins, each owning a domain: `auth.ts` for registration/login/JWT, `google.ts` for OAuth2, `2fa.ts` for two-factor auth, `ws-friends.ts` for friends and online status, `chat.ts` for messaging, `gameController.ts` for game sessions, `matchHistory.ts` for results. Data is stored in SQLite — no external database server needed.

**Pong engine**

Server-authoritative game loop in `src/pong/`. `GamesManager.ts` handles matchmaking and invitations, `Game.ts` runs the physics tick, `Bot.ts` provides three AI difficulty levels with pre-trained data in `data/AI/`, `Tournament.ts` manages brackets, `Bonus.ts` spawns mid-game items. Stats charts are rendered server-side via Chart.js and `@napi-rs/canvas`.

**Bomb Party engine**

Word game module in `src/modules/bombparty/`. The `engine/` directory splits logic into phases, turns, rules, and state. `RoomManager.ts` supports multiple concurrent rooms. Players find words containing a given syllable before a timer runs out — syllables extracted from French and English dictionaries. `validation.ts` checks words, `security.ts` handles anti-cheat, `stats/` persists performance.

**Frontend — React + Vite + Tailwind**

Single-Page Application with React Router. State split between Zustand stores and React contexts (user, WebSocket, friends, game, notifications, settings). PixiJS powers the animated space background. i18next handles internationalization.

**WebSocket endpoints**

| Endpoint        | Usage                           |
| :-------------- | :------------------------------ |
| `/game`         | Pong state (positions, scores)  |
| `/bombparty/ws` | Bomb Party turns, words, scores |
| `/chat`         | Instant messaging               |
| `/ws-friends`   | Online status, friend requests  |
| `/socket.io/`   | General notifications           |

## Commands

| Command       | Description                                  |
| :------------ | :------------------------------------------- |
| `make`        | Production build and launch                  |
| `make dev`    | Development mode with hot reload             |
| `make down`   | Stop all containers                          |
| `make status` | Show Docker containers, networks, and images |
| `make clean`  | Remove containers, images, and certificates  |
| `make re`     | Full clean and rebuild                       |
| `make certs`  | Generate SSL certificates only               |

## Project structure

```
├── Makefile                      — build and launch commands
└── srcs/
    ├── .env.example              — environment template
    ├── generate_certs.sh         — SSL cert generation + .env setup
    ├── docker-compose.yml        — production
    ├── docker-compose.dev.yml    — development (+ Adminer)
    ├── nginx/
    │   └── nginx.conf            — reverse proxy, SSL, WebSocket routing
    ├── backend/
    │   └── app/src/
    │       ├── server.ts         — Fastify entry point
    │       ├── plugins/          — auth, chat, friends, games, settings
    │       ├── pong/             — Pong game engine
    │       └── modules/bombparty/— Bomb Party game engine
    └── frontend/
        └── app/src/
            ├── main.tsx          — React entry point
            ├── pages/            — application pages
            ├── Components/       — reusable UI components
            ├── contexts/         — React context providers
            ├── pong/             — Pong rendering (Canvas)
            ├── game-bomb-party/  — Bomb Party UI
            └── locales/          — i18n translations
```
