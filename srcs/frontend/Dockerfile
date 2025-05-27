FROM node:20-alpine

WORKDIR /usr/app
RUN npm create vite@latest . -- --template react-ts && \
	npm install && \
	npm install -D tailwindcss@3 postcss autoprefixer && \
	npx tailwindcss init -p

ENTRYPOINT ["npm", "run", "dev"]
