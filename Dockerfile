# Build stage for React client
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app

# Install server dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy server source
COPY server/ ./server/

# Copy built React client
COPY --from=client-build /app/client/dist ./client/dist

# Create data directory for SQLite
RUN mkdir -p /data

EXPOSE 4000

ENV NODE_ENV=production
ENV PORT=4000
ENV DATA_DIR=/data

CMD ["node", "server/index.js"]
