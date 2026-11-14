# API (NestJS + Prisma + SQLite). Contexto: raíz del repositorio.
FROM node:24.22.2-bookworm-slim AS build
WORKDIR /app

COPY backend/package.json backend/package-lock.json ./
RUN npm ci

COPY backend/ ./
# El cliente de Prisma se genera; no necesita una base de datos real.
RUN DATABASE_URL="file:/tmp/generate.db" npx prisma generate \
 && npm run build \
 && npm prune --omit=dev

FROM node:24.22.2-bookworm-slim
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    TRUST_PROXY=1 \
    DATABASE_URL=file:/data/inventario.db \
    BACKUP_DIR=/data/backups
WORKDIR /app

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma/migrations ./prisma/migrations

RUN mkdir -p /data/backups && chown -R node:node /data
USER node
VOLUME ["/data"]
EXPOSE 3000

# Al arrancar aplica las migraciones pendientes (con respaldo previo).
CMD ["node", "dist/main.js"]
