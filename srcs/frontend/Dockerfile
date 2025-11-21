FROM node:24-alpine

WORKDIR /usr/app

COPY ./app/package*.json ./
RUN npm install

COPY ./app .

CMD ["sh", "-c", "npm run dev"]
