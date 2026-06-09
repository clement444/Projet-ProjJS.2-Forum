FROM node:20-alpine

WORKDIR /app

COPY package.json .
RUN npm install

COPY . .

RUN mkdir -p static/uploads

EXPOSE 8080

CMD ["node", "index.js"]
