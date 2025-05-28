FROM node:20-alpine

WORKDIR /usr/app
RUN npm create vite@latest . -- --template react-ts && \
	npm install -D tailwindcss @tailwindcss/vite vite-plugin-checker typescript@5.4.5

ENTRYPOINT ["npm", "run", "dev"]
