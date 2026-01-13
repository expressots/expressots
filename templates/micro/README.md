# ExpressoTS Micro

A lightweight, minimal ExpressoTS microservice template with powerful enterprise features.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run in production
npm run prod
```

## Project Structure

```
src/
└── api.ts          # Single file API

examples/           # Advanced feature examples
├── circuit-breaker.example.ts
├── service-discovery.example.ts
├── service-client.example.ts
├── serverless-lambda.example.ts
└── full-di-api.example.ts
```

## Adding Routes

```typescript
import { micro } from "@expressots/adapter-express";

const app = micro();

// Simple GET route - return value is auto-sent as JSON
app.get("/users", () => {
    return { users: [] };
});

// POST route with request body
app.post("/users", (req) => {
    const user = req.body;
    return user;
});

// Route with parameters
app.get("/users/:id", (req) => {
    return { id: req.params.id };
});

// Route with query parameters
app.get("/search", (req) => {
    return { query: req.query.q };
});

// Use res directly for custom responses
app.post("/custom", (req, res) => {
    res.status(201).json({ created: true });
});

app.listen(3000);
```

## Middleware Support

```typescript
// Global middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// Path-specific middleware
app.use("/api", authMiddleware);

// Route-specific middleware (before handler)
const validate = (req, res, next) => {
    if (!req.body.name) {
        return res.status(400).json({ error: "Name required" });
    }
    next();
};

app.post("/users", validate, (req) => {
    return { created: true };
});
```

## Error Handling

```typescript
app.setErrorHandler((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: err.message });
});
```

## Configuration

```typescript
const app = micro({
    autoParseJson: true,      // Enable JSON body parsing (default: true)
    globalPrefix: "/api",     // Add prefix to all routes
    showBanner: true,         // Show startup banner (default: true)
});
```

## Advanced Features

ExpressoTS Micro includes powerful enterprise features for building production-ready microservices:

### Circuit Breaker

Protect your services from cascading failures:

```typescript
import { CircuitBreaker } from "@expressots/adapter-express";

const breaker = new CircuitBreaker({
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000,
});

app.get("/external-api", async () => {
    return await breaker.execute(async () => {
        const response = await fetch("https://api.example.com/data");
        return response.json();
    });
});
```

### Service Discovery

Register and discover service instances with load balancing:

```typescript
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

// Get a healthy instance (round-robin load balancing)
const instance = discovery.getService("user-service");
```

### Service Client

HTTP client with retry logic and circuit breaker integration:

```typescript
import { ServiceClient } from "@expressots/adapter-express";

const client = new ServiceClient({
    name: "user-service",
    baseUrl: "http://localhost:3001",
    timeout: 5000,
    retries: 3,
    circuitBreaker: {
        failureThreshold: 5,
        timeout: 60000,
    },
});

app.get("/users", async () => {
    return await client.get("/api/users");
});
```

### Serverless Deployment

Deploy to AWS Lambda, Vercel, or Cloudflare Workers. See `examples/serverless-lambda.example.ts`.

## Upgrading to Full DI

When you need dependency injection and more advanced features, upgrade to `createMicroAPI()`:

```typescript
import { createMicroAPI } from "@expressots/adapter-express";

const microAPI = createMicroAPI();
microAPI.setGlobalRoutePrefix("/api/v1");

const app = microAPI.build();
app.Middleware.parse();

app.Route.get("/users", async (req, res) => {
    res.json([]);
});

await app.listen(3000);
```

See `examples/full-di-api.example.ts` for a complete example.

## Examples

Check the `examples/` folder for complete working examples of:

- **Circuit Breaker** - Fault tolerance pattern
- **Service Discovery** - Service registration and load balancing
- **Service Client** - HTTP client with retries
- **Serverless** - AWS Lambda deployment
- **Full DI API** - Upgrade path with dependency injection

Run examples with:

```bash
npm run example:circuit-breaker
npm run example:service-discovery
```

## Learn More

- [ExpressoTS Documentation](https://expresso-ts.com)
- [GitHub Repository](https://github.com/expressots)
- [Discord Community](https://discord.gg/PyPJfGK)
- [Advanced Features Guide](./ADVANCED.md)
- [Upgrading Guide](./UPGRADING.md)
