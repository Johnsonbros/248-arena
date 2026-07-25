# arena-access — build + runtime (no docker socket, no shell tools needed)
FROM node:22-alpine

WORKDIR /app
COPY package.json tsconfig.json ./
RUN npm install --no-audit --no-fund
COPY src ./src
RUN npm run build

ENV NODE_ENV=production
EXPOSE 8766
CMD ["node", "dist/index.js"]
