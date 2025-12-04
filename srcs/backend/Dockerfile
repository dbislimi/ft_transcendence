FROM node:24-alpine

WORKDIR /usr/app

RUN apk add --no-cache sqlite sqlite-dev python3 make g++

COPY ./app/package*.json ./

RUN npm install --verbose

COPY ./app .

RUN npm run build
RUN mkdir -p dist/public

CMD ["npm", "run", "start"]