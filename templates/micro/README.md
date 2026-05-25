# ExpressoTS Micro

A minimal, production-ready microservice template built on [ExpressoTS](https://expresso-ts.com/).

## Quick Start

```bash
npm run dev
```

Your API is running at `http://localhost:3000`.

## Project Structure

```
src/
  api.ts          # Application entry point
test/
  api.spec.ts     # Tests
```

## API

```typescript
import { micro } from "@expressots/adapter-express";

const app = micro();

app.get("/", () => "Hello from ExpressoTS Micro API!");

app.listen(3000);
```

### Configuration

```typescript
const app = micro({
  globalPrefix: "/api",       // Prefix all routes (e.g. /api/users)
  autoParseJson: true,        // Auto JSON + urlencoded parsing (default: true)
  showBanner: true,           // Show startup log line (default: true)
  environment: "development", // Auto-detected from NODE_ENV if not set
});
```

### Route Handlers

Handlers can return values directly — no need for `res.send()`:

```typescript
// String responses
app.get("/", () => "Hello!");

// JSON responses (auto-serialized)
app.get("/users", () => [{ id: 1, name: "Alice" }]);

// Async handlers
app.get("/users/:id", async (req) => {
  return await db.findUser(req.params.id);
});

// Full Express access when needed
app.get("/download", (req, res) => {
  res.download("/path/to/file.pdf");
});
```

### Middleware

Standard Express middleware works with `app.use()`:

```typescript
import cors from "cors";
import helmet from "helmet";

app.use(cors());
app.use(helmet());
```

Per-route middleware:

```typescript
import { rateLimit } from "express-rate-limit";

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });

app.post("/login", limiter, (req) => {
  // rate-limited route
});
```

### Error Handling

```typescript
app.setErrorHandler((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({
    status,
    message: err.message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});
```

### Server Access

```typescript
await app.listen(3000);

// Access the HTTP server (for WebSockets, graceful shutdown, etc.)
const server = app.getHttpServer();

// Access the Express app (for advanced configuration)
const expressApp = app.getApp();
```

## Production Wiring

A production-ready setup with common middleware:

```typescript
import { micro } from "@expressots/adapter-express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";

const app = micro({ globalPrefix: "/api" });

// Security
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(",") }));
app.use(helmet());

// Rate limiting
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// Health probes
app.get("/health", () => ({ status: "ok", uptime: process.uptime() }));
app.get("/ready", () => ({ status: "ready" }));

// Routes
app.get("/users", async () => {
  return await fetchUsers();
});

// Error handler
app.setErrorHandler((err, req, res, next) => {
  res.status(err.status || 500).json({
    type: "https://expressots.dev/errors/internal",
    title: "Internal Server Error",
    status: err.status || 500,
    detail: err.message,
  });
});

app.listen(process.env.PORT || 3000);
```

### Input Validation

Use any validation library as middleware:

```typescript
import { z } from "zod";

const validateBody = (schema: z.ZodSchema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      type: "https://expressots.dev/errors/validation",
      title: "Validation Error",
      status: 400,
      errors: result.error.flatten().fieldErrors,
    });
  }
  req.body = result.data;
  next();
};

const CreateUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

app.post("/users", validateBody(CreateUserSchema), async (req) => {
  return await createUser(req.body);
});
```

### Graceful Shutdown

In production (`NODE_ENV=production`), the framework automatically drains
connections on SIGTERM/SIGINT with a 5-second timeout before forcing exit.

In development, it exits immediately for fast hot-reload.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with hot-reload (development) |
| `npm run build` | Compile TypeScript |
| `npm run prod` | Run production build |
| `npm run test` | Run tests |
| `npm run test:cov` | Run tests with coverage |
| `npm run lint` | Lint and fix |
| `npm run format` | Format with Prettier |

## Documentation

- [ExpressoTS Documentation](https://expresso-ts.com/)
- [CLI Documentation](https://expresso-ts.com/docs/category/cli)

## License

[MIT](LICENSE.md)
