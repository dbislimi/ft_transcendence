FROM node:24-alpine

WORKDIR /usr/app

RUN apk add --no-cache sqlite sqlite-dev python3 make g++

COPY ./app/package*.json ./

RUN npm install
RUN mkdir -p /usr/certs
RUN npm rebuild sqlite3

CMD ["sh", "-c", "npm run dev"]