# Use Node 22 on Alpine for minimal footprint
FROM node:22-alpine

WORKDIR /usr/src/app

# Install only production deps
COPY package*.json ./
RUN npm install --omit=dev

# Copy your app source
COPY . .

# Listen on your hard-coded port
EXPOSE 8192

# Start the server
CMD ["node", "index.js"]
