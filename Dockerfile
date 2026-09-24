# syntax=docker/dockerfile:1
# Bloomery – Next.js standalone build. See docs/DEPLOYMENT.md.

# ---------- 1. dependencies ----------
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------- 2. build ----------
FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Public URL is inlined into the client bundle at build time.
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# DATABASE_URL is intentionally NOT available here: the build prerenders from content/*.json.
RUN BUILD_STANDALONE=1 npm run build

# ---------- 3. runtime ----------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs

# Standalone server (includes the traced node_modules, e.g. postgres + sharp)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# Editorial content: JSON store and fallback/seed source for the Postgres store
COPY --from=builder --chown=nextjs:nodejs /app/content ./content
# Writable dirs for the JSON fallback (orders …) and local uploads – mount volumes here
RUN mkdir -p data public/uploads && chown -R nextjs:nodejs data public/uploads content

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
