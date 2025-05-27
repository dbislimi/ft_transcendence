#!/bin/sh
set -e

mkdir -p app
cd app

# First-time init (runs once)
if [ ! -f "package.json" ]; then
  npm init -y
  npm install fastify
  npm install -D typescript ts-node-dev @types/node
  npx npm-add-script -k "build" -v "tsc -p tsconfig.json" && \
  npx npm-add-script -k "start" -v "node index.js"
  npx tsc --init

  mkdir src
  cat <<EOF > src/server.ts
import Fastify from 'fastify';

const fastify = Fastify({ logger: true });

fastify.get('/', async () => {
  return { hello: 'from docker' };
});

fastify.listen({ port: 3000, host: '0.0.0.0' });
EOF

  npx npm-add-script -k "dev" -v "ts-node-dev --respawn --transpile-only src/server.ts"
fi

echo "Starting dev server..."
npm run dev

