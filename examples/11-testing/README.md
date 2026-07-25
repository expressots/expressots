# 11-testing

Unit, integration, and load testing patterns with `@expressots/core` testing utilities.

## Documentation

- [Testing feature guide](https://doc.expresso-ts.com/docs/features/testing)

## Quick start

```bash
npm install
cp .env.example .env
npm run dev
```

Try the calculator endpoints:

```bash
curl "http://localhost:3000/api/calculator/add?a=2&b=3"
curl "http://localhost:3000/api/calculator/multiply?a=4&b=5"
```

## Tests

```bash
npm test
```

This example includes:

- `test/unit/calculator.spec.ts` - pure unit tests for `CalculatorService`
- `test/integration/api.spec.ts` - HTTP integration tests with `createTestApp`
- `test/load/smoke.spec.ts` - concurrent request smoke test with `loadTest`

## Related examples

| Example | Topic |
| --- | --- |
| [01-starter-api](../01-starter-api/) | Minimal API |
| [08-events](../08-events/) | Domain events |
