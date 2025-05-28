FROM node:20-alpine

WORKDIR /usr/app
RUN npm init -y && \
	npm install fastify && \
	npm install -D typescript@5.4.5 ts-node-dev @types/node && \
	npx npm-add-script -k "build" -v "tsc -p tsconfig.json" && \
	npx npm-add-script -k "start" -v "node index.js" && \
	npx npm-add-script -k "dev" -v "ts-node-dev --respawn --transpile-only src/server.ts" && \
	npx tsc --init

ENTRYPOINT ["npm", "run", "dev"]
