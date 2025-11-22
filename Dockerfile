# Dockerfile
FROM node:18-alpine

WORKDIR /app

# install dependencies first (layer caching)
COPY package.json package-lock.json* ./

RUN npm install --production

# copy app
COPY . .

EXPOSE 8080
ENV PORT=8080

CMD ["npm", "start"]
