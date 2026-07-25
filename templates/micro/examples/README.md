# ExpressoTS Micro examples

Self-contained reference scripts that show off the v4 features available in the `micro` template. Each example can be run independently.

## Run an example

```bash
npm run example:circuit-breaker
npm run example:service-discovery
npm run example:service-client
npm run example:full-di-api
```

The serverless example deploys to AWS Lambda — see the bottom of `serverless-lambda.example.ts` for the full SAM template and deployment steps.

## What each example covers

### `circuit-breaker.example.ts`

Demonstrates the [Circuit Breaker](https://expresso-ts.com/docs/guides/microservices-architecture#circuit-breaker) pattern to protect downstream services from cascading failures.

- CLOSED → OPEN → HALF_OPEN state machine.
- Configurable failure / success thresholds, timeouts, monitoring windows.
- `getStats()` for telemetry, `reset()` / `open()` for manual control.

### `service-discovery.example.ts`

Static and dynamic service registration with round-robin load balancing.

- `ServiceDiscovery({ type: "static" })` plus `registerService` / `deregisterService`.
- Health tracking with `updateHealth` and listing with `listServices`.
- Endpoints that demonstrate self-registration and health updates.

### `service-client.example.ts`

HTTP client for service-to-service communication.

- `ServiceClient` with timeouts, retries, headers, and circuit breaker integration.
- Per-request headers, query parameters, and typed responses.
- A "fan-out" example that calls user + order + analytics services from a single endpoint.

### `serverless-lambda.example.ts`

Same `micro()` app, deployable to AWS Lambda.

- Conditionally suppresses the banner when running inside Lambda.
- Wires `awsLambdaAdapter(app.getApp(), { binaryContentTypes, debug })`.
- Local development still works via `app.listen(3000, ...)`.
- Inline SAM template + deployment notes.

For Vercel and Cloudflare Workers, swap `awsLambdaAdapter` for `vercelAdapter` / `cloudflareAdapter` — same shape, same handler export pattern. See the [Micro API guide](https://expresso-ts.com/docs/guides/micro-api).

### `full-di-api.example.ts`

The upgrade path when you want DI but still want a single-file footprint. Uses `createMicroAPI()` to attach a container, a structured Logger, middleware and an error handler.

If your app keeps growing past this point, graduate to the `application` template:

```bash
expressots new my-app --template application
```

## API decision matrix

| Feature                       | `micro()` | `createMicroAPI()` | `application` template |
| ----------------------------- | :-------: | :----------------: | :--------------------: |
| Simple routing                |     ✅    |          ✅        |           ✅           |
| Return-value auto-response    |     ✅    |          ❌        |           ✅           |
| Middleware                    |   basic   |       pipeline     |        pipeline        |
| DI container                  |     ❌    |          ✅        |           ✅           |
| Provider registration         |     ❌    |          ✅        |           ✅           |
| Lifecycle hooks               |     ❌    |          ❌        |           ✅           |
| Interceptors / Guards / Events|     ❌    |       partial      |           ✅           |
| Auto-discovery via modules    |     ❌    |          ❌        |           ✅           |
| Best fit                      |  Serverless / single-file | Single-file + DI | Real apps & APIs |

## Use the right tool

- **Use `micro()`** for serverless functions, prototypes, and small APIs that don't need DI.
- **Use `createMicroAPI()`** when you want a container in a single file (this example).
- **Use the `application` template** when you want modules, lifecycle hooks, interceptors, guards, events, and auto-discovery.
- **Use the Circuit Breaker** whenever you call something that can fail and is not under your control.
- **Use Service Discovery** when you run more than one instance of a service and need round-robin or health-aware routing.
- **Use Service Client** when you need typed, resilient HTTP calls between services.

## Learn more

- [Micro API guide](https://expresso-ts.com/docs/guides/micro-api)
- [Microservices architecture](https://expresso-ts.com/docs/guides/microservices-architecture)
- [Application template README](../README.md)
- [ExpressoTS docs](https://expresso-ts.com/docs/)
