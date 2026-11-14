# Frontend (Angular) servido por Caddy, que además da HTTPS y reenvía /api.
FROM node:24.22.2-bookworm-slim AS build
WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npx ng build

FROM caddy:2.10.2-alpine
COPY --from=build /app/dist/frontend/browser /srv
# Configuración web por defecto: la API va por el mismo dominio en /api.
# Cada cliente la reemplaza montando su propia carpeta "marca".
COPY deploy/web/app-config.web.json /srv/app-config.json
COPY deploy/web/Caddyfile /etc/caddy/Caddyfile
