# Console - Public API

> 🎯 **Goal**: Display styled startup messages in the console

## Overview

The `Console` class provides methods for displaying styled messages in the console, primarily used for startup banners.

**Note**: This is typically used internally by the framework. You usually don't need to use it directly.

---

## Quick Start

```typescript
import { Console } from "@expressots/core";

// Used internally by bootstrap()
const console = container.get(Console);
await console.messageServer(3000, "development", {
  appName: "My App",
  appVersion: "1.0.0"
});
```

---

## API Reference

### `Console.messageServer(port, environment, consoleMessage?)`

Display a message in the console with details about the running server.

**Parameters:**

- `port` - The port number the server is running on
- `environment` - The server environment (`"development"`, `"production"`, etc.)
- `consoleMessage` - Optional application message details

**Color Coding:**

- `development` → Yellow background
- `production` → Green background
- Other → Red background

**Example:**

```typescript
await console.messageServer(3000, "development", {
  appName: "My API",
  appVersion: "2.0.0"
});

// Output:
// [My API] version [2.0.0] is running on port [3000] - Environment: [development]
```

---

## Color Styles

The console uses ANSI color codes for terminal output:

- `ColorStyle.Yellow` - Development environment
- `ColorStyle.Green` - Production environment
- `ColorStyle.Red` - Other environments
- `ColorStyle.Blue` - Available but not used by default
- `ColorStyle.None` - No color

---

## Related Documentation

- [Application Bootstrap](../application/.docs/bootstrap-public-api.md) - Uses Console internally

