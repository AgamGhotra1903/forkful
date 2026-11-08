# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Production stage ─────────────────────────────────────────────────────────
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 5002
CMD ["node", "dist/index.js"]
