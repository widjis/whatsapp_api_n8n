# 1. Base image (now Node 22)
FROM node:22-alpine

# 2. Set working directory
WORKDIR /usr/src/app

# 3. Copy & install dependencies
COPY package*.json ./
RUN npm ci --only=production

# 4. Copy app source
COPY . .

# 5. Expose your app port (adjust if different)
EXPOSE 3000

# 6. Launch
CMD ["node", "index.js"]
