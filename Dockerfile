# syntax=docker/dockerfile:1.7
#
# Self-hosted storefront + dashboard (one Next.js server for every store and the merchant/admin consoles).
# Not needed on Cloudflare (see README); useful for a VPS.
#
#   docker build -t shop-web \
#     --build-arg IMAGE_HOSTS="cdn.example.com" .
#
# Runtime configuration (env): API_URL, PLATFORM_DOMAIN, STOREFRONT_SCHEME, STOREFRONT_REVALIDATE.
# IMAGE_HOSTS is a BUILD argument: next/image's allowed hosts are baked in at build time.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
ARG IMAGE_HOSTS=""
ENV NEXT_OUTPUT=standalone IMAGE_HOSTS=${IMAGE_HOSTS} NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# next/font downloads Google Fonts here, so this stage needs outbound network access.
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --retries=5 CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1
CMD ["node", "server.js"]
