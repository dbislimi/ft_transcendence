FROM node:24-alpine

WORKDIR /usr/app

RUN apk add --no-cache sqlite sqlite-dev python3 make g++

COPY ./app/package*.json ./
RUN npm install

# COPY ./app .
# Commenté pour utiliser le volume mount à la place
# Les fichiers sources seront montés via docker-compose volumes
RUN npm rebuild sqlite3

CMD ["sh", "-c", "npm run dev"]