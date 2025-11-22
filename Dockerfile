# Use imagem oficial Node.js
FROM node:18

# Define diretório de trabalho
WORKDIR /app

# Copia package.json e instala dependências
COPY package*.json ./
RUN npm install --only=production

# Copia o resto do código
COPY . .

# Expõe a porta usada pelo app
EXPOSE 8080

# Comando que inicia o servidor
CMD ["node", "server.js"]
