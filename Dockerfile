# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS dependencies
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS production-dependencies
RUN npm prune --omit=dev

FROM node:22-bookworm-slim AS builder
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV WATSON_CDI_RUNTIME=ibm

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build:ibm

FROM node:22-bookworm-slim AS runner
WORKDIR /app

ARG APP_VERSION=6.0.0
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV WATSON_CDI_RUNTIME=ibm
ENV APP_VERSION=${APP_VERSION}
ENV HOSTNAME=0.0.0.0
ENV PORT=8080

COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/db/postgres/migrate.mjs ./db/postgres/migrate.mjs
COPY --from=builder --chown=node:node /app/db/postgres/deploy.mjs ./db/postgres/deploy.mjs
COPY --from=builder --chown=node:node /app/db/postgres/seed.mjs ./db/postgres/seed.mjs
COPY --from=builder --chown=node:node /app/db/postgres/migrations ./db/postgres/migrations

USER node

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD ["node", "-e", "fetch(`http://127.0.0.1:${process.env.PORT || 8080}/api/health/live`).then((response) => { if (!response.ok) process.exit(1); }).catch(() => process.exit(1));"]

CMD ["node", "server.js"]
