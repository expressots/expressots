# 10-redis-cache

Redis-backed cache provider with an in-memory fallback when `REDIS_URL` is unset.

## Quick start

```bash
npm install
cp .env.example .env
npm run dev
```

Store and read cache entries:

```bash
curl -X POST http://localhost:3000/api/cache/session \
  -H "Content-Type: application/json" \
  -d '{"value":"abc123","ttlSeconds":300}'

curl http://localhost:3000/api/cache/session
curl http://localhost:3000/api/health
```

With Redis, set `REDIS_URL=redis://localhost:6379` in `.env`.

## Tests

```bash
npm test
```

## Related examples

| Example | Topic |
| --- | --- |
| [09-message-queue](../09-message-queue/) | BullMQ jobs |
| [12-docker-compose](../12-docker-compose/) | Postgres + Redis via Docker |
