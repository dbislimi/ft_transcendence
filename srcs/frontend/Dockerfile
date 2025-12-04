FROM node:24-alpine

WORKDIR /usr/app

COPY ./app/package*.json ./
RUN npm install

COPY ./app .

RUN npm run build

CMD ["npm", "run", "preview"]