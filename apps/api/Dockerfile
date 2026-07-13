# Base Node Image
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root and api package files
COPY package.json ./
COPY apps/api/package.json ./apps/api/

# Install dependencies (only for API)
WORKDIR /app/apps/api
RUN npm install

# Copy source code
WORKDIR /app
COPY apps/api ./apps/api

# Generate Prisma and Build API
WORKDIR /app/apps/api
RUN npm run prisma:generate
RUN npm run build

# Production Stage
FROM node:20-alpine AS production

WORKDIR /app/apps/api

# Copy necessary files from builder
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/prisma.config.ts ./
COPY --from=builder /app/apps/api/scripts ./scripts

EXPOSE 3001

CMD ["npm", "run", "start"]
