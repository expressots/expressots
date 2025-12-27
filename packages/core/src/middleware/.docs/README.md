# Middleware Documentation

Comprehensive documentation for ExpressoTS middleware system.

## 📚 Documentation Index

### For Application Developers

- **[Middleware Public API](./middleware-public-api.md)** - Complete guide to using middleware
  - Built-in middleware helpers
  - Custom middleware
  - Middleware presets
  - Conditional middleware
  - Content negotiation
  - Request validation
  - Performance profiling

### For Framework Developers

- **[Middleware Architecture](./architecture.md)** - Internal architecture and design decisions
  - Middleware pipeline management
  - Auto-discovery mechanism
  - Middleware resolver
  - Profiling system

## 🎯 Quick Start

### Built-in Middleware

```typescript
import { AppFactory, IService } from "@expressots/core";

@provide(App)
export class App extends AppFactory {
  configureServices(services: IService): void {
    // Add built-in middleware
    services.Middleware.addCors();
    services.Middleware.addBodyParser();
    services.Middleware.addHelmet();
    services.Middleware.addCompression();
  }
}
```

### Custom Middleware

```typescript
import { ExpressoMiddleware } from "@expressots/core";

class AuthMiddleware extends ExpressoMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  }
}

// Use in application
services.Middleware.addMiddleware(new AuthMiddleware());
```

### Middleware Presets

```typescript
// Apply API preset
services.Middleware.usePreset("api");

// Apply with overrides
services.Middleware.usePreset("api", {
  overrides: {
    Cors: { origin: "https://myapp.com" }
  }
});
```

## 📖 Documentation Structure

```
.docs/
├── README.md                    # This file
├── middleware-public-api.md     # Public API documentation
├── architecture.md              # Framework architecture
├── examples/                    # Runnable examples
│   ├── basic-middleware.example.ts
│   ├── custom-middleware.example.ts
│   └── middleware-presets.example.ts
└── diagrams/                    # Visual diagrams
    └── middleware-pipeline.mermaid
```

## 🔗 Related Documentation

- [Application Bootstrap](../application/.docs/bootstrap-public-api.md) - Application initialization
- [Error Handling](../error/.docs/error-public-api.md) - Error handling
- [Dependency Injection](../di/.docs/) - DI container

## 💡 Key Concepts

- **Middleware Pipeline**: Ordered collection of middleware handlers
- **Built-in Middleware**: Pre-configured middleware helpers
- **Custom Middleware**: User-defined middleware classes
- **Middleware Presets**: Pre-configured middleware bundles
- **Conditional Middleware**: Middleware that runs conditionally
- **Content Negotiation**: Automatic response format selection
- **Middleware Profiler**: Performance tracking and metrics

## ⚠️ Important Notes

1. **Order Matters**: Middleware executes in the order it's added
2. **Built-in First**: Add built-in middleware before custom middleware
3. **Error Handler Last**: Error handler should be added last
4. **Presets Override**: Presets can be customized with overrides

