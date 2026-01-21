FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* bun.lock* ./
RUN npm install -g bun
RUN bun install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm install -g bun
# Build the specific app
RUN bun run build --filter=@ica/server

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 serverjs

COPY --from=builder --chown=serverjs:nodejs /app/apps/server/dist ./dist
# We might need node_modules if not bundled fully, check build output. 
# Using bun build usually bundles. 
# But if there are native deps like @hono/node-server which relies on node, we might need specific handling or just run with bun.

# Install bun in runner
RUN npm install -g bun

USER serverjs

EXPOSE 3001

CMD ["bun", "run", "dist/index.js"]
