# syntax=docker/dockerfile:1

# ============================================================
# Stage 1 — Builder: install all deps, generate client, compile TS
# ============================================================
FROM node:22-alpine AS builder
WORKDIR /app

# Install dependencies against the lockfile for reproducible builds.
COPY package*.json ./
RUN npm ci

# Generate the Prisma client (needs the schema).
COPY prisma ./prisma
RUN npx prisma generate

# Compile TypeScript → dist/.
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ============================================================
# Stage 2 — Production: slim image with only prod deps + dist
# ============================================================
FROM node:22-alpine AS production
ENV NODE_ENV=production
WORKDIR /app

# Only production dependencies (prisma CLI is a prod dep so migrations work here).
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Regenerate the Prisma client for this image, then copy the compiled app.
COPY prisma ./prisma
RUN npx prisma generate
COPY --from=builder /app/dist ./dist

# Drop root privileges.
USER node

EXPOSE 5000

# Apply pending migrations, then start. (Seeding is a separate, opt-in step.)
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
