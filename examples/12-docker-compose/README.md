# 12-docker-compose

Local Postgres and Redis via Docker Compose, with a Postgres-backed health check.

## Quick start

Start infrastructure:

```bash
docker compose up -d
```

Run the API locally against the compose services:

```bash
npm install
cp .env.example .env
npm run dev
```

Check health (expects `ok` when Postgres is reachable):

```bash
curl http://localhost:3000/api/health
```

## Docker image

Build and run the API container:

```bash
docker build -t expressots-docker-compose .
docker run --rm -p 3000:3000 \
  -e DB_HOST=host.docker.internal \
  -e DB_PORT=5432 \
  -e DB_NAME=expressots \
  -e DB_USER=postgres \
  -e DB_PASSWORD=postgres \
  expressots-docker-compose
```

On Linux you may need `--add-host=host.docker.internal:host-gateway`.

## Environment

| Variable | Default | Description |
| --- | --- | --- |
| `DB_HOST` | _(unset)_ | Postgres host (`localhost` when using compose) |
| `DB_PORT` | `5432` | Postgres port |
| `DB_NAME` | `expressots` | Database name |
| `DB_USER` | `postgres` | Database user |
| `DB_PASSWORD` | `postgres` | Database password |
| `REDIS_URL` | _(unset)_ | Optional Redis URL for other examples |

## Tests

```bash
npm test
```

Tests run without Docker and expect a degraded health response when `DB_HOST` is unset.

## Related examples

| Example | Topic |
| --- | --- |
| [05-database-postgres](../05-database-postgres/) | Postgres patterns |
| [09-message-queue](../09-message-queue/) | BullMQ + Redis |
| [10-redis-cache](../10-redis-cache/) | Redis cache |
