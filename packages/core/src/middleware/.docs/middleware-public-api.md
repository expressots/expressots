# Middleware Public API

Complete guide to middleware in ExpressoTS applications.

## Table of Contents

- [Quick Start](#quick-start)
- [Built-in Middleware](#built-in-middleware)
- [Custom Middleware](#custom-middleware)
- [Middleware Presets](#middleware-presets)
- [Conditional Middleware](#conditional-middleware)
- [Content Negotiation](#content-negotiation)
- [Request Validation](#request-validation)
- [Performance Profiling](#performance-profiling)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

## Quick Start

ExpressoTS provides a comprehensive middleware system with:

- **Built-in Middleware**: Pre-configured helpers for common middleware
- **Custom Middleware**: Create your own middleware classes
- **Middleware Presets**: Pre-configured bundles for common scenarios
- **Conditional Middleware**: Middleware that runs conditionally
- **Content Negotiation**: Automatic response format selection
- **Performance Profiling**: Track middleware performance

### Basic Usage

```typescript
import { IService } from "@expressots/core";
import { AppExpress } from "@expressots/adapter-express";

@provide(App)
export class App extends AppExpress {
  configureServices(services: IService): void {
    // Add built-in middleware
    services.Middleware.addCors();
    services.Middleware.addBodyParser();
    services.Middleware.addHelmet();
  }
}
```

## Built-in Middleware

### CORS

Enable Cross-Origin Resource Sharing:

```typescript
services.Middleware.addCors({
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"]
});
```

### Body Parser

Parse JSON request bodies:

```typescript
services.Middleware.addBodyParser({
  limit: "10mb",
  type: "application/json"
});
```

### URL Encoded Parser

Parse URL-encoded request bodies:

```typescript
services.Middleware.addUrlEncodedParser({
  extended: true
});
```

### Helmet

Set security HTTP headers:

```typescript
services.Middleware.addHelmet({
  contentSecurityPolicy: {
    directives: {
      "default-src": ["'self'"]
    }
  }
});
```

### Compression

Compress response bodies:

```typescript
services.Middleware.addCompression({
  level: 6,
  threshold: 1024
});
```

### Rate Limiting

Limit request rate:

```typescript
services.Middleware.addRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  limit: 100 // 100 requests per minute
});
```

### Cookie Parser

Parse cookies:

```typescript
services.Middleware.addCookieParser("secret-key");
```

### Session

Enable sessions:

```typescript
services.Middleware.addSession({
  secret: "session-secret",
  resave: false,
  saveUninitialized: false
});
```

### Cookie Session

Enable cookie-based sessions:

```typescript
services.Middleware.addCookieSession({
  name: "session",
  keys: ["key1", "key2"]
});
```

### Morgan

HTTP request logging:

```typescript
services.Middleware.addMorgan("combined");
```

### Serve Static

Serve static files:

```typescript
services.Middleware.serveStatic("public", {
  maxAge: "1d"
});
```

### Serve Favicon

Serve favicon:

```typescript
services.Middleware.addServeFavicon("public/favicon.ico");
```

## Custom Middleware

### Express Handler

Add a simple Express handler:

```typescript
services.Middleware.addMiddleware((req, res, next) => {
  // Custom logic
  req.customProperty = "value";
  next();
});
```

### Expresso Middleware Class

Create a custom middleware class:

```typescript
import { ExpressoMiddleware } from "@expressots/core";

class AuthMiddleware extends ExpressoMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    // Validate token
    next();
  }
}

// Use in application
services.Middleware.addMiddleware(new AuthMiddleware());
```

### Middleware Configuration

Add middleware for specific routes:

```typescript
services.Middleware.addMiddleware({
  path: "/api",
  middlewares: [
    authMiddleware,
    rateLimiter
  ]
});
```

## Middleware Presets

### Available Presets

- **api**: REST APIs with 10mb body limits, strict CORS, rate limiting, compression
- **web**: Server-rendered apps with cookies, 5mb body limits, permissive CORS
- **spa**: SPA backends with static fallback
- **microservice**: Lightweight internal services (1mb body, no security)
- **graphql**: GraphQL servers with 50mb JSON limit, POST-only CORS
- **minimal**: Body parsing only, no security or compression
- **development**: Relaxed security, morgan logging, large body limit
- **production**: Hardened defaults with strict security and rate limiting

### Using Presets

**Basic Usage:**
```typescript
services.Middleware.applyPreset("api");
```

**With Overrides:**

`applyPreset()` accepts a `Partial<MiddlewareConfig>` that deep-merges with the
preset defaults. Override a category by passing an object, or pass `false` to
disable it entirely.

```typescript
services.Middleware.applyPreset("api", {
  security: {
    cors: { origin: "https://myapp.com", credentials: true },
    rateLimit: { windowMs: 60_000, max: 200 },
  },
  compress: { level: 9 },
});
```

**Disable a Category:**
```typescript
services.Middleware.applyPreset("api", {
  logger: false,
  compress: false,
});
```

**Define a Custom Preset:**
```typescript
services.Middleware.definePreset("edge", {
  parse: { json: { limit: "1mb" } },
  security: { headers: "helmet", cors: { origin: true } },
  compress: { level: 6 },
});

services.Middleware.applyPreset("edge");
```

## Conditional Middleware

Add middleware that only runs when a condition is met:

```typescript
services.Middleware.addConditional({
  middleware: rateLimiter,
  condition: (req) => !req.headers["x-internal-service"],
  name: "conditional-rate-limit",
  category: "security"
});
```

**Use Cases:**
- Rate limiting for external requests only
- Authentication for specific routes
- Logging for non-admin users
- Compression for non-API routes

## Content Negotiation

Automatically select response format based on Accept headers:

```typescript
services.Middleware.addContentNegotiation({
  defaultFormat: "application/json",
  formatters: [JsonFormatter, XmlFormatter, CsvFormatter],
  strictMode: false
});
```

**Supported Formats:**
- JSON
- XML
- CSV
- YAML
- Plain Text

## Request Validation

Configure automatic request validation:

```typescript
services.Middleware.addValidation({
  adapter: "class-validator",
  enableRequestValidation: true,
  enableResponseValidation: false
});
```

**Supported Adapters:**
- class-validator
- Zod
- Yup
- Custom adapters

## Performance Profiling

Enable middleware performance profiling:

```typescript
// Profiling is automatically enabled when middleware is added
// Access metrics via health check endpoint
services.Middleware.addHealthCheck({
  path: "/health/middleware",
  includeMetrics: true
});
```

**Metrics Provided:**
- Average execution time
- Min/max execution time
- Percentiles (p50, p95, p99)
- Error count
- Total calls

## Error Handling

Configure error handler:

```typescript
services.Middleware.setErrorHandler({
  errorHandler: customErrorHandler,
  showStackTrace: false,
  enableExceptionFilters: true,
  container: container
});
```

**Error Handler Options:**
- `errorHandler`: Custom error handler function
- `showStackTrace`: Show stack traces in responses
- `enableExceptionFilters`: Enable exception filter integration
- `container`: DI container for exception filters

## Best Practices

### 1. Order Matters

Add middleware in the correct order:

```typescript
// 1. Security middleware first
services.Middleware.addHelmet();
services.Middleware.addCors();

// 2. Parsers
services.Middleware.addBodyParser();
services.Middleware.addUrlEncodedParser();

// 3. Custom middleware
services.Middleware.addMiddleware(authMiddleware);

// 4. Error handler last
services.Middleware.setErrorHandler({});
```

### 2. Use Presets

Use presets for common configurations:

```typescript
services.Middleware.applyPreset("api", {
  security: {
    cors: { origin: process.env.ALLOWED_ORIGIN },
  },
});
```

### 3. Conditional Middleware

Use conditional middleware for route-specific logic:

```typescript
services.Middleware.addConditional({
  middleware: rateLimiter,
  condition: (req) => req.path.startsWith("/api/public")
});
```

### 4. Performance Monitoring

Enable profiling in development:

```typescript
if (process.env.NODE_ENV === "development") {
  services.Middleware.addHealthCheck({
    includeMetrics: true
  });
}
```

### 5. Error Handling

Always add error handler last:

```typescript
services.Middleware.setErrorHandler({
  showStackTrace: process.env.NODE_ENV === "development"
});
```

## Troubleshooting

### Middleware Not Executing

**Problem:** Middleware is not executing.

**Solutions:**
1. Check middleware order
2. Ensure middleware calls `next()`
3. Verify middleware is added before routes
4. Check for errors in middleware

### Preset Not Working

**Problem:** Preset middleware not being applied.

**Solutions:**
1. Check if middleware packages are installed
2. Use `onlyInstalled: true` option
3. Check preset configuration
4. Verify middleware names match

### Performance Issues

**Problem:** Application is slow.

**Solutions:**
1. Enable profiling to identify bottlenecks
2. Check middleware execution order
3. Use conditional middleware to skip unnecessary processing
4. Review middleware configuration

