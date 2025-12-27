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
import { AppFactory, IService } from "@expressots/core";

@provide(App)
export class App extends AppFactory {
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

- **api**: Optimized for REST APIs
- **web**: Optimized for web applications
- **microservice**: Optimized for microservices
- **graphql**: Optimized for GraphQL APIs
- **minimal**: Minimal middleware set
- **secure**: Maximum security configuration
- **development**: Development-friendly configuration
- **production**: Production-optimized configuration

### Using Presets

**Basic Usage:**
```typescript
services.Middleware.usePreset("api");
```

**With Overrides:**
```typescript
services.Middleware.usePreset("api", {
  overrides: {
    Cors: { origin: "https://myapp.com" },
    RateLimiter: { limit: 200 }
  }
});
```

**Skip Middleware:**
```typescript
services.Middleware.usePreset("api", {
  skip: ["RateLimiter"]
});
```

**Only Installed:**
```typescript
services.Middleware.usePreset("api", {
  onlyInstalled: true
});
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
// Instead of adding each middleware individually
services.Middleware.usePreset("api", {
  overrides: {
    Cors: { origin: process.env.ALLOWED_ORIGIN }
  }
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

