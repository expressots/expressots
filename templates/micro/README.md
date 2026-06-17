# ExpressoTS Micro

A lightweight, minimal ExpressoTS v4 microservice template. Ships with the `micro()` fluent API plus working examples for circuit breakers, service discovery, service clients, and serverless deployments.

Choose this template when you want:

- **Sub-100 ms cold starts** — no DI container.
- **Single-file Express apps** that scale through composition rather than module wiring.
- **Serverless deployments** to AWS Lambda, Vercel, Cloudflare Workers.

Need DI, scopes, lifecycle hooks, or large-scale modular layout? Use the **`application`** template instead:

```bash
expressots new my-app --template application
```

## Quick start

```bash
npm install
npm run dev          # tsx --watch on src/api.ts
npm run build        # tsc to dist/
npm run prod         # node dist/src/api.js
```

The default app responds on <http://localhost:3000/>.

## Project structure

```
src/
└── api.ts                          # Single-file app — fluent micro() API

examples/                           # Reference recipes — run with npm run example:*
├── circuit-breaker.example.ts      # CircuitBreaker integration
├── service-discovery.example.ts    # Static + dynamic discovery
├── service-client.example.ts       # HTTP client with retries + breaker
├── serverless-lambda.example.ts    # AWS Lambda deployment
└── full-di-api.example.ts          # When to graduate to the application template

test/
└── api.spec.ts                     # Jest + native fetch
```

## Defining routes

```ts
import { micro } from "@expressots/adapter-express";

const app = micro();

// Return value is auto-serialised as JSON.
app.get("/users", () => ({ users: [] }));

// Pull the request via the second arg.
app.post("/users", (req) => req.body);

// Route parameters.
app.get("/users/:id", (req) => ({ id: req.params.id }));

// Use res directly when you need full control.
app.post("/custom", (_, res) => res.status(201).json({ created: true }));

app.listen(3000);
```

## Middleware

```ts
// Global
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Path scoped
app.use("/api", authMiddleware);

// Per-route, before the handler
const validate = (req, res, next) => {
  if (!req.body.name) return res.status(400).json({ error: "Name required" });
  next();
};

app.post("/users", validate, (req) => req.body);
```

## Error handling

```ts
app.setErrorHandler((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});
```

## `micro()` options

```ts
const app = micro({
  autoParseJson: true,        // default true
  globalPrefix: "/api",       // optional
  showBanner: true,           // default true
});
```

## Advanced features

### Circuit breaker

```ts
import { CircuitBreaker } from "@expressots/adapter-express";

const breaker = new CircuitBreaker({
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60_000,
});

app.get("/external", async () =>
  breaker.execute(async () => (await fetch("https://api.example.com/data")).json()),
);
```

### Service discovery

```ts
import { ServiceDiscovery } from "@expressots/adapter-express";

const discovery = new ServiceDiscovery({ type: "static" });
discovery.registerService({
  id: "user-service-1",
  name: "user-service",
  host: "localhost",
  port: 3001,
  health: "healthy",
  lastCheck: new Date(),
});

const instance = discovery.getService("user-service"); // round-robin LB
```

### Service client

```ts
import { ServiceClient } from "@expressots/adapter-express";

const client = new ServiceClient({
  name: "user-service",
  baseUrl: "http://localhost:3001",
  timeout: 5_000,
  retries: 3,
  circuitBreaker: { failureThreshold: 5, timeout: 60_000 },
});

app.get("/users", () => client.get("/api/users"));
```

### Serverless

```ts
import { awsLambdaAdapter } from "@expressots/adapter-express";

// In your Lambda handler file:
export const handler = awsLambdaAdapter(app, {
  binaryContentTypes: ["application/pdf", "image/*"],
});
```

See [`examples/serverless-lambda.example.ts`](./examples/serverless-lambda.example.ts) for the full setup including `serverless.yml`. Read [Micro API + serverless](https://expresso-ts.com/docs/guides/micro-api) for body / base64 / binary handling.

## Running the examples

Every example under `examples/` is a self-contained script:

```bash
npm run example:circuit-breaker
npm run example:service-discovery
npm run example:service-client
npm run example:full-di-api
```

## When to graduate to the application template

You need to move when:

- You want **dependency injection** with `@provide` / `@inject`.
- You want **lifecycle hooks** (`IBootstrap`, `IShutdown`, `postConstruct`, `preDestroy`).
- You want **interceptors / guards / event handlers** auto-discovered from the container.
- You're carrying more than a handful of routes and middleware in `src/api.ts`.

Run:

```bash
expressots new my-app --template application
```

See the [Application template README](https://github.com/expressots/templates/tree/main/application) for the full layout and the [`application` template starter](https://expresso-ts.com/docs/core/first-steps).

## Testing

```ts
import { micro, MicroApp } from "@expressots/adapter-express";
import type { AddressInfo } from "net";

describe("Micro API", () => {
  let api: MicroApp;
  let baseUrl: string;

  beforeAll(async () => {
    api = micro({ showBanner: false });
    api.get("/", () => "Hello from ExpressoTS Micro API!");
    await api.listen(0);
    const { port } = api.getHttpServer().address() as AddressInfo;
    baseUrl = `http://localhost:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => api.getHttpServer().close(() => resolve()));
  });

  it("returns the welcome message", async () => {
    const response = await fetch(`${baseUrl}/`);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("Hello from ExpressoTS Micro API!");
  });
});
```

## Learn more

- [ExpressoTS docs](https://expresso-ts.com/docs/)
- [Micro API guide](https://expresso-ts.com/docs/guides/micro-api)
- [Microservices architecture](https://expresso-ts.com/docs/guides/microservices-architecture)
- [CLI reference](https://expresso-ts.com/docs/cli/overview)
- [GitHub](https://github.com/expressots) · [Discord](https://discord.gg/PyPJfGK)

## License

[MIT](LICENSE.md)
