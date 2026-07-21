# arena-deploy-mcp — build + runtime
FROM node:22-alpine

# docker CLI (talks to the mounted host socket), git + curl for deploy/status
RUN apk add --no-cache docker-cli git curl

WORKDIR /app
COPY package.json tsconfig.json ./
RUN npm install --no-audit --no-fund
COPY src ./src
RUN npm run build

ENV NODE_ENV=production
# MCP_PORT is the port the server listens on inside the container
EXPOSE 8765
CMD ["node", "dist/index.js"]
