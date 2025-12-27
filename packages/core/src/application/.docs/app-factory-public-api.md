# AppFactory - Public API

> 🎯 **Goal**: Factory for creating web server instances (typically used internally)

## Overview

`AppFactory` is a factory class responsible for creating instances of web server implementations. It's primarily used internally by the `bootstrap()` function, but is exposed for advanced use cases.

---

## Quick Start

**Note**: You typically don't need to use `AppFactory` directly. Use `bootstrap()` instead.

```typescript
import { bootstrap } from "@expressots/core";
import { App } from "./app";

// Recommended: Use bootstrap()
await bootstrap(App);
```

---

## When to Use AppFactory Directly

`AppFactory` is useful when you need:

- Custom application initialization logic
- Manual control over the creation process
- Integration with custom build systems
- Testing scenarios requiring direct instantiation

**Otherwise, use `bootstrap()` - it handles everything for you.**

---

## API Reference

### `AppFactory.create<T>(webServerType)`

Creates an instance of a web server.

**Parameters:**

- `webServerType` - Constructor of a class that implements `IWebServer`

**Returns:** `Promise<IWebServerBuilder>`

**Throws:** `Error` if `webServerType` is not a valid constructor

**Example:**

```typescript
import { AppFactory } from "@expressots/core";
import { AppExpress } from "@expressots/adapter-express";

class MyApp extends AppExpress {
  protected configureServices(): void {
    // Your configuration
  }
}

const app = await AppFactory.create(MyApp);
```

---

## Comparison: AppFactory vs Bootstrap

### Using AppFactory (Manual)

```typescript
import { AppFactory } from "@expressots/core";

const app = await AppFactory.create(MyApp);
await app.listen(3000, {
  appName: "My App",
  appVersion: "1.0.0",
});
```

**What you handle:**

- Port configuration
- App info (name, version)
- Environment loading
- Error handling
- Startup banner

### Using Bootstrap (Recommended)

```typescript
import { bootstrap } from "@expressots/core";

await bootstrap(MyApp, {
  port: 3000,
  appName: "My App",
  appVersion: "1.0.0",
});
```

**What bootstrap handles:**

- ✅ Port configuration
- ✅ App info from package.json
- ✅ Environment loading
- ✅ Error handling
- ✅ Startup banner
- ✅ Graceful shutdown
- ✅ CI/CD detection

---

## Advanced Use Cases

### Custom Initialization

```typescript
import { AppFactory } from "@expressots/core";

// Create instance
const app = await AppFactory.create(MyApp);

// Custom initialization logic
await customSetup(app);

// Then start server
await app.listen(3000);
```

### Testing

```typescript
import { AppFactory } from "@expressots/core";

// Create instance for testing
const app = await AppFactory.create(TestApp);

// Test app configuration before starting
expect(app).toBeDefined();
```

---

## Best Practices

1. **Prefer `bootstrap()`**: Use `bootstrap()` for normal application startup
2. **Use AppFactory for**: Custom initialization, testing, or advanced scenarios
3. **Error Handling**: Always wrap in try-catch when using directly
4. **Type Safety**: Use TypeScript generics for type-safe instantiation

---

## Related Documentation

- [Bootstrap Guide](./bootstrap-public-api.md) - Recommended way to start applications
- [Architecture Guide](./architecture.md) - Internal implementation details
