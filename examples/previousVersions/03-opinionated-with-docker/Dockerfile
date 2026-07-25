FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile --production; \
  elif [ -f package-lock.json ]; then npm ci --production; \
  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile --production; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Rebuild the source code only when needed
FROM base AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN mkdir logs
RUN npm run build

# Production image, copy all the files and run expressots
FROM base AS runner

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 expressots

COPY --from=deps --chown=expressots:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=expressots:nodejs /app/logs ./logs
COPY --from=builder --chown=expressots:nodejs /app/dist ./dist
COPY --from=builder --chown=expressots:nodejs app/entrypoint.sh app/register-path.js app/.env app/tsconfig.json app/package.json ./

USER expressots

EXPOSE 3000

ENTRYPOINT ["sh", "entrypoint.sh"]