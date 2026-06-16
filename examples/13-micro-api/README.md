# 13-micro-api

Lightweight ExpressoTS v4 microservice using the `micro()` fluent API. No DI container, single entry file (`src/api.ts`).

## Documentation

- [Micro API guide](https://doc.expresso-ts.com/docs/guides/micro-api)

## Quick start

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:3000/`, `http://localhost:3000/health`, and `http://localhost:3000/users`.

## Tests

```bash
npm test
```

## Related examples

| Example | Topic |
| --- | --- |
| [01-starter-api](../01-starter-api/) | Full application template with DI |
| [15-openapi-studio](../15-openapi-studio/) | OpenAPI generation and Studio workflow |
