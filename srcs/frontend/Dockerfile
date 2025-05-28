FROM node:20-alpine

WORKDIR /usr/app
RUN npm create vite@latest . -- --template react-ts && \
	npm install -D tailwindcss @tailwindcss/vite && \
	npm install -D vite-plugin-checker

ENTRYPOINT ["npm", "run", "dev"]
