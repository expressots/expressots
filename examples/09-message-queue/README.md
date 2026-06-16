# 09-message-queue

BullMQ email queue with Redis, plus an in-memory fallback when `REDIS_URL` is unset.

## Quick start

```bash
npm install
cp .env.example .env
npm run dev
```

Without Redis, jobs run through the in-memory fallback (ideal for local dev and tests).

With Redis:

```bash
# start redis locally, then set REDIS_URL in .env
REDIS_URL=redis://localhost:6379 npm run dev
```

Enqueue an email job:

```bash
curl -X POST http://localhost:3000/api/jobs/email \
  -H "Content-Type: application/json" \
  -d '{"to":"user@example.com","subject":"Hello","body":"Queued message"}'
```

## Tests

```bash
npm test
```

## Related examples

| Example | Topic |
| --- | --- |
| [08-events](../08-events/) | Domain events |
| [10-redis-cache](../10-redis-cache/) | Redis cache |
| [12-docker-compose](../12-docker-compose/) | Postgres + Redis via Docker |
