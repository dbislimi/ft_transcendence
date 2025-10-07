FROM node:24.1.0-alpine3.22

WORKDIR /usr/app

RUN apk add --no-cache sqlite sqlite-dev python3 make g++

COPY ./app/package*.json ./
RUN npm install
RUN npm rebuild sqlite3

COPY ./app .

CMD ["npm", "run", "dev"]