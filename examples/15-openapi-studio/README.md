# 15-openapi-studio

Minimal REST API for exploring OpenAPI generation and the ExpressoTS Studio workflow. Routes are discovered automatically; no OpenAPI decorators required.

## Documentation

- [OpenAPI spec generation](https://doc.expresso-ts.com/docs/features/openapi)
- [Studio overview](https://doc.expresso-ts.com/docs/studio/overview)
- [Studio CLI](https://doc.expresso-ts.com/docs/cli/studio)

## Quick start

```bash
npm install
cp .env.example .env
npm run dev
```

The API listens on `http://localhost:3000/api/` with:

- `GET /api/`
- `GET /api/health`
- `POST /api/echo` with JSON body `{ "message": "..." }`

## Studio workflow

1. Start the API in one terminal:

   ```bash
   npm run dev
   ```

2. Launch Studio in another terminal:

   ```bash
   npm run studio
   ```

   Studio opens at `http://localhost:3333` (UI) with the agent on port `3334`.

3. In Studio, open the **API Client** view and exercise each route (`GET /`, `GET /health`, `POST /echo`). Send a JSON body on `/echo` so Studio records request and response shapes.

4. Expand the **OpenAPI spec** panel, click **Regenerate**, and review the generated document. Download `openapi.json` or copy the spec to compare with a CLI run:

   ```bash
   npx expressots openapi emit --out openapi.json --src ./src
   ```

Recorded traffic enriches response schemas and examples beyond what a static scan alone can infer.

## Tests

```bash
npm test
```

## Related examples

| Example | Topic |
| --- | --- |
| [01-starter-api](../01-starter-api/) | Application template basics |
| [13-micro-api](../13-micro-api/) | Lightweight `micro()` API |
