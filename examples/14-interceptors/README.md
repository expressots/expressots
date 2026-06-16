# 14-interceptors

Aspect-oriented interceptors for logging and request timing. Registers custom interceptors with `setupInterceptorsForExpress()` and applies them with `@UseInterceptors()`.

## Documentation

- [Interceptors feature guide](https://doc.expresso-ts.com/docs/features/interceptors)

## Quick start

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:3000/api/demo` and watch the server logs for request/response lines from `LoggingInterceptor`.

## Tests

```bash
npm test
```

## Related examples

| Example | Topic |
| --- | --- |
| [01-starter-api](../01-starter-api/) | Application lifecycle and controllers |
| [08-events](../08-events/) | Cross-cutting event handlers |
