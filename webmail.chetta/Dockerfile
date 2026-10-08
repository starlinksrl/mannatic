# Multi-stage Dockerfile per Webmail IMAP (Ubuntu / Linux)

# --- Stage 1: Build Frontend & Backend ---
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Installa strumenti di compilazione necessari per moduli nativi C++ (better-sqlite3)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copia i manifesti delle dipendenze
COPY package.json tsconfig.json ./
COPY server/tsconfig.json ./server/
COPY client/vite.config.ts client/tailwind.config.js client/postcss.config.js ./client/

# Installa tutte le dipendenze
RUN npm install

# Copia il codice sorgente
COPY server ./server
COPY client ./client

# Compila Frontend e Backend
RUN npm run build && npm prune --omit=dev

# --- Stage 2: Immagine Finale di Produzione Leggera ---
FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8004
ENV HOST=0.0.0.0
ENV DATA_DIR=/app/data

# Installa solo le librerie di runtime necessarie per SQLite
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copia le dipendenze di produzione già compilate e i file compilati
COPY package.json ./
COPY --from=builder /app/node_modules ./node_modules

# Copia i file generati dalla build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server/db/schema.sql ./dist/server/db/schema.sql

# Crea la directory di persistenza dati e assegna i permessi
RUN mkdir -p /app/data && chown -R node:node /app

USER node

EXPOSE 8004

# Healthcheck per monitoraggio container
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "const req = require('http').get('http://127.0.0.1:8004/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)); req.on('error', () => process.exit(1));"

CMD ["node", "dist/server/index.js"]
