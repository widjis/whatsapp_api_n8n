# 1. Use Node 22 on Alpine for minimal size
FROM node:22-alpine

# 2. App directory
WORKDIR /usr/src/app

# 3. Install build deps & clean up
RUN apk add --no-cache python3 make g++        \
    # (some native modules may need python or build tools)
 && npm ci --only=production

# 4. Copy code
COPY . .

# 5. Expose port (adjust if your app uses another)
EXPOSE 3000

# 6. Start the server
CMD ["node", "index.js"]
