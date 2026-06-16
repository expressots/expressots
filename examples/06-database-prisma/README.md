# 06-database-prisma

Prisma ORM integration with `IBootstrap` / `IShutdown` lifecycle.

## Documentation

- [Database integration](https://doc.expresso-ts.com/docs/guides/database-integration)

## Quick start

```bash
npm install
cp .env.example .env
npx prisma migrate dev --name init
npm run dev
```

Set `DATABASE_URL` in `.env` to your PostgreSQL connection string.

### Try it

```bash
curl -s -X POST http://localhost:3000/api/users \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","name":"Alice"}'

curl -s http://localhost:3000/api/users
```

## Tests

```bash
# Skips integration tests without DATABASE_URL
npm test

# Run against a migrated database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/expressots npm test
```

## Prisma commands

```bash
npx prisma generate
npx prisma migrate dev
npx prisma studio
```
