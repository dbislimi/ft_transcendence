FROM node:24.1.0-alpine3.22

WORKDIR /usr/app

COPY ./app/package*.json ./
RUN npm install

COPY ./app .

CMD ["npm", "run", "dev"]
