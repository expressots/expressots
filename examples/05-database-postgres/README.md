# 05-database-postgres

PostgreSQL integration with `IBootstrap` / `IShutdown` lifecycle and raw SQL repositories.

## Documentation

- [Database integration](https://doc.expresso-ts.com/docs/guides/database-integration)

## Quick start

Start PostgreSQL (Docker):

```bash
docker run --name expressots-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=expressots \
  -p 5432:5432 \
  -d postgres:16
```

```bash
npm install
cp .env.example .env
npm run dev
```

### Try it

```bash
curl -s -X POST http://localhost:3000/api/users \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","name":"Alice"}'

curl -s http://localhost:3000/api/users
```

## Tests

```bash
# Skip integration tests when no database is running
SKIP_DB=true npm test

# Or run against a local postgres instance
npm test
```

Tests skip automatically when `SKIP_DB=true` or the database connection fails.
