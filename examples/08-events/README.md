# 08-events

Type-safe domain events with auto-discovered `@OnEvent` handlers.

## Documentation

- [Events feature guide](https://doc.expresso-ts.com/docs/features/events)

## Quick start

```bash
npm install
cp .env.example .env
npm run dev
```

Create a user (triggers `UserCreatedEvent` and the welcome email handler):

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"ada@example.com"}'
```

## Tests

```bash
npm test
```

## Related examples

| Example | Topic |
| --- | --- |
| [09-message-queue](../09-message-queue/) | BullMQ jobs |
| [11-testing](../11-testing/) | Testing patterns |
