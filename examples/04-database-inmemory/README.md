# 04-database-inmemory

CRUD API backed by the built-in `InMemoryDBProvider` and a thin repository layer.

## Documentation

- [Database integration](https://doc.expresso-ts.com/docs/guides/database-integration)
- [In-Memory DB](https://doc.expresso-ts.com/docs/features/in-memory-db)

## Quick start

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
npm test
```
