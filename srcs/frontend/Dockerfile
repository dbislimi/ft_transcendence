FROM node:20-alpine

WORKDIR /usr/app
RUN npm create vite@latest . -- --template react-ts && \
	npm install -D tailwindcss @tailwindcss/vite

ENTRYPOINT ["npm", "run", "dev"]
