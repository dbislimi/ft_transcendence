# ft_transcendence Project Context

This document provides a general context of the ft_transcendence project.

## Project Overview

ft_transcendence is a web-based multiplayer Pong game application. It features a distinct frontend and backend architecture, containerized using Docker for streamlined development and deployment. The project also integrates an AI component, likely for providing computer-controlled opponents in the game.

## Project Structure

The project is organized into the following main directories:

- **`/srcs`**: Contains the source code for the frontend and backend applications.
  - **`backend`**: A Node.js application written in TypeScript, serving as the API. It manages game logic, user authentication, and other server-side functionalities.
  - **`frontend`**: A React application, also in TypeScript, that provides the user interface for the game.
  - **`docker-compose.yml`**: The Docker Compose file that orchestrates the different services of the project.

- **`/AI`**: This directory holds the necessary files for the AI, including saved Q-tables from reinforcement learning training sessions. This suggests the AI learns and improves its gameplay over time.

- **`Makefile`**: Provides a set of commands to simplify the management of the Docker containers.

## Backend Details

The backend is a [Fastify](https://www.fastify.io/) server written in TypeScript. It's responsible for the business logic of the application.

### Key Technologies

- **Framework**: Fastify
- **Database**: SQLite, accessed via the `sqlite3` library.
- **Authentication**: Implemented using `@fastify/oauth2` for OAuth 2.0 flows (including Google authentication) and `jsonwebtoken` for session management.
- **WebSockets**: Real-time communication for features like chat and live notifications is handled by `@fastify/websocket`.
- **Environment Variables**: `dotenv` is used for managing environment variables.

### Features

The backend is structured around a plugin-based architecture. Here are some of the core features implemented as plugins:

- **Authentication**: Manages user registration, login, and OAuth2 integration.
- **User Management**: Handles user profiles, settings, and online status.
- **Friends**: Manages friend requests and the list of friends for each user.
- **Chat**: Provides real-time chat functionality.
- **Game Logic**: The `pong` directory contains the core logic for the Pong game.
- **Match History**: Stores and retrieves the history of games played.

## Frontend Details

The frontend is a single-page application (SPA) built with [React](https://react.dev/) and [Vite](https://vitejs.dev/).

### Key Technologies

- **Framework**: React
- **Build Tool**: Vite
- **Routing**: `react-router-dom` is used for client-side routing.
- **Internationalization**: `i18next` and `react-i18next` are used to support multiple languages.
- **Game Rendering**: [PixiJS](https://pixijs.com/) is used for rendering the game, suggesting a 2D canvas-based game.
- **Styling**: The project uses CSS and likely a CSS framework (to be confirmed).

### Architecture

The frontend code is organized into several directories:

- **`pages`**: Contains the top-level components for each page of the application (e.g., Home, Profile, Friends, Game).
- **`Components`**: A collection of reusable UI components used throughout the application.
- **`context`**: Contains React Context providers for managing global state, such as user information (`UserContext`), WebSocket connections (`WebSocketContext`), and game sessions (`GameSessionContext`).
- **`hooks`**: Custom React hooks for encapsulating and reusing stateful logic.
- **`services`**: Likely contains functions for making API calls to the backend.

## How to Run the Project

The project is designed to be run with Docker and Docker Compose, with a `Makefile` that simplifies the process.

### Prerequisites

- Docker
- Docker Compose
- `make`

### Running the Application

1. **Build and start the services**:
   To build the Docker images and start the frontend and backend containers, run the following command from the project's root directory:
   ```bash
   make up
   ```
   Alternatively, you can use `make all`.

2. **Accessing the applications**:
   - The **frontend** will be available at [http://localhost:5173](http://localhost:5173).
   - The **backend** API will be running on [http://localhost:3000](http://localhost:3000).

### Stopping the Application

To stop the running containers, use the command:
```bash
make down
```

### Cleaning Up

The `Makefile` also includes commands for cleaning up the Docker environment:
- `make clean`: Stops and removes all containers, images, and networks.
- `make fclean`: Performs a more thorough cleanup, including volumes.

### Rebuilding the Application

To force a rebuild of the Docker images and restart the services, you can use:
```bash
make re
```