# arena-examiner — build + runtime (no docker socket; talks only to the LLM
# gateway and the access service on the internal network)
FROM node:22-alpine

WORKDIR /app
COPY package.json tsconfig.json ./
RUN npm install --no-audit --no-fund
COPY src ./src
RUN npm run build
COPY corpus.json ./corpus.json

ENV NODE_ENV=production
EXPOSE 8767
CMD ["node", "dist/index.js"]
