FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
COPY .npmrc ./
RUN npm install --legacy-peer-deps

COPY . .

EXPOSE 3000

CMD ["npm", "start"]