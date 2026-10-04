# 10-redis-cache

Uses the official `@expressots/cache` system plugin with lifecycle discovery,
health reporting and either memory or Redis. There is no automatic fallback.

```sh
npm install
cp .env.example .env
npm run dev
```

For Redis, run `docker run --rm -p 6379:6379 redis:7.2-alpine`. The example
explicitly installs the optional ioredis peer and selects Redis in `.env.example`.
For memory, set `CACHE_DRIVER=memory`; Redis is then not loaded or connected.

```sh
curl -X POST http://localhost:3000/api/cache/session \
  -H 'Content-Type: application/json' \
  -d '{"value":"abc123","ttlSeconds":300}'
curl http://localhost:3000/api/cache/session
curl http://localhost:3000/api/health
```

The HTTP example retains ttlSeconds and converts to the package's millisecond
TTL. Omission uses CACHE_DEFAULT_TTL_MS; zero disables expiry. Invalid TTL
rejects. CacheProvider is registered through CreateModule and injected directly
into controllers. bootstrap(App) manages provider startup/shutdown. A failed
Redis connection fails initialization rather than selecting memory.

```sh
npm test
npm run build
```

Tests explicitly select memory and exercise health, round trips and cache misses.
For package semantics and real Redis tests see [@expressots/cache](../../packages/cache/README.md).
