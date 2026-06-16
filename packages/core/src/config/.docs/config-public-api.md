# Configuration Public API

> **Complete user-facing documentation for ExpressoTS configuration system**

## Quick Start

Define your configuration with full type safety:

```typescript
import { defineConfig, Env } from "@expressots/core";

// One-liner: Define your entire config with full type safety!
export const config = defineConfig({
  server: {
    port: Env.port("PORT", { default: 3000 }),
    host: Env.string("HOST", { default: "0.0.0.0" }),
  },
  database: {
    url: Env.url("DATABASE_URL", { required: true }),
    pool: Env.number("DB_POOL_SIZE", { default: 10 }),
  },
  auth: {
    secret: Env.secret("JWT_SECRET", { required: true }),
  },
});

// Usage with FULL type safety!
config.values.server.port     // number
config.values.database.url    // string
config.values.auth.secret     // SecretValue (auto-redacted)

// Validate at startup
if (!config.isValid()) {
  console.error(config.getErrors());
  process.exit(1);
}
```

## Core Concepts

### Type-Safe Configuration

ExpressoTS provides **full TypeScript inference** - no type casting needed! The configuration system automatically infers types from field definitions.

```typescript
const config = defineConfig({
  port: Env.port("PORT", { default: 3000 }),
  debug: Env.boolean("DEBUG", { default: false }),
  logLevel: Env.enum("LOG_LEVEL", ["debug", "info", "warn", "error"]),
});

// TypeScript knows the exact types!
config.values.port      // number
config.values.debug     // boolean
config.values.logLevel  // "debug" | "info" | "warn" | "error"
```

### Field Types

#### String Fields

```typescript
Env.string("DB_HOST", {
  default: "localhost",
  description: "Database host address",
  trim: true,           // Auto-trim whitespace
  format: "email",       // Validate format (email, url, uuid, etc.)
  required: true,        // Must be provided
  minLength: 1,
  maxLength: 255,
})
```

#### Number Fields

```typescript
Env.number("MAX_CONNECTIONS", {
  default: 10,
  min: 1,
  max: 100,
  integer: true,         // Only allow integers
})

Env.port("PORT", {       // Specialized port field (1-65535)
  default: 3000,
})
```

#### Boolean Fields

```typescript
Env.boolean("DEBUG", {
  default: false,
  // Accepts: "true", "false", "1", "0", "yes", "no"
})
```

#### Enum Fields

```typescript
Env.enum("LOG_LEVEL", ["debug", "info", "warn", "error"], {
  default: "info",
  caseSensitive: false,  // Case-insensitive matching
})
```

#### URL Fields

```typescript
Env.url("DATABASE_URL", {
  required: true,
  protocols: ["postgresql:", "mysql:"],  // Allowed protocols
})
```

#### JSON Fields

```typescript
Env.json("FEATURE_FLAGS", {
  default: {},
  schema: {              // Optional JSON schema validation
    type: "object",
    properties: {
      enableNewUI: { type: "boolean" }
    }
  }
})
```

#### Array Fields

```typescript
Env.array("ALLOWED_ORIGINS", {
  default: [],
  separator: ",",        // Split by comma
  itemType: "string",    // Each item is a string
  minItems: 1,
  maxItems: 10,
})
```

## Secret Management

### Creating Secrets

Secrets are automatically wrapped in `SecretValue` to prevent accidental logging:

```typescript
const config = defineConfig({
  apiKey: Env.secret("API_KEY", {
    required: true,
    revealStart: 4,      // Show first 4 chars in dev mode
    revealEnd: 4,        // Show last 4 chars in dev mode
    allowPartialReveal: true,  // Allow partial reveal in dev
  }),
});

// Safe for logging - shows redacted
console.log(config.values.apiKey);  // "[REDACTED]" (prod) or "sk_l...z789" (dev)

// Access actual value when needed
const key = config.values.apiKey.value;  // "sk_live_abc123xyz789"

// Safe comparison without revealing
config.values.apiKey.equals("sk_live_abc123xyz789");  // true
```

### Secret Features

- **Auto-redaction**: Automatically redacted in logs and JSON serialization
- **Partial reveal**: In development mode, can show first/last N characters
- **Timing-safe comparison**: Uses timing-safe comparison to prevent timing attacks
- **Safe string conversion**: `toString()` always returns `[REDACTED]` in production

## Multi-Environment Defaults

Define different defaults for different environments:

```typescript
const config = defineConfig({
  apiUrl: Env.url("API_URL", {
    default: {
      development: "http://localhost:3000",
      staging: "https://api-staging.example.com",
      production: "https://api.example.com",
    },
  }),
  debug: Env.boolean("DEBUG", {
    default: {
      development: true,
      staging: false,
      production: false,
    },
  }),
});
```

## Validation

### Automatic Validation

Configuration is automatically validated when accessed:

```typescript
const config = defineConfig({
  port: Env.port("PORT", {
    required: true,
    min: 1,
    max: 65535,
  }),
});

// Check if valid
if (!config.isValid()) {
  const errors = config.getErrors();
  // errors: [
  //   {
  //     envVar: "PORT",
  //     code: "REQUIRED",
  //     message: "PORT is required but not set",
  //     expected: "number between 1 and 65535",
  //     hint: "Set PORT=3000 in your .env file"
  //   }
  // ]
}
```

### Helpful Error Messages

Validation errors include:
- **Expected value**: What was expected
- **Received value**: What was actually received
- **Example**: Example of correct value
- **Hint**: Helpful suggestion for fixing

## Advanced Usage

### Nested Configuration

```typescript
const config = defineConfig({
  server: {
    port: Env.port("PORT", { default: 3000 }),
    host: Env.string("HOST", { default: "0.0.0.0" }),
  },
  database: {
    url: Env.url("DATABASE_URL", { required: true }),
    pool: {
      min: Env.number("DB_POOL_MIN", { default: 2 }),
      max: Env.number("DB_POOL_MAX", { default: 10 }),
    },
  },
});

// Access nested values
config.values.server.port
config.values.database.pool.min
```

### Custom Field Options

```typescript
Env.string("CUSTOM_FIELD", {
  description: "Custom field description",
  example: "example-value",
  hint: "This field is used for...",
  transform: (value) => value.toUpperCase(),  // Transform value
})
```

### Configuration Options

```typescript
const config = defineConfig(
  {
    // ... fields
  },
  {
    // Options
    strict: true,              // Fail on unknown env vars
    prefix: "APP_",          // Only read env vars with prefix
    caseSensitive: false,    // Case-insensitive env var names
  }
);
```

## API Reference

### `defineConfig(schema, options?)`

Creates a type-safe configuration instance.

**Parameters:**
- `schema`: Configuration schema object
- `options`: Optional configuration options

**Returns:** `IConfigInstance<T>` - Configuration instance with:
- `values`: Resolved configuration values
- `isValid()`: Check if configuration is valid
- `getErrors()`: Get validation errors
- `getField(path)`: Get a specific field
- `toJSON()`: Serialize to JSON (secrets redacted)

### `Env` Object

Provides field builders for all types:
- `Env.string()` - String field
- `Env.number()` - Number field
- `Env.boolean()` - Boolean field
- `Env.enum()` - Enum field
- `Env.url()` - URL field
- `Env.port()` - Port field (1-65535)
- `Env.json()` - JSON field
- `Env.array()` - Array field
- `Env.secret()` - Secret field

## Troubleshooting

### Configuration Not Loading

1. **Check environment variables**: Ensure `.env` file exists and variables are set
2. **Check validation errors**: Call `config.getErrors()` to see what's wrong
3. **Check required fields**: Ensure all required fields are provided

### Secrets Not Working

1. **Check dev mode**: Partial reveal only works in development mode
2. **Check options**: Ensure `allowPartialReveal: true` is set
3. **Use `.value`**: Access actual value with `.value` property

### Type Inference Issues

1. **Use explicit types**: If inference fails, use explicit type annotations
2. **Check field types**: Ensure field builder matches expected type
3. **Use type assertions**: As last resort, use type assertions

## Best Practices

1. **Use defaults**: Always provide sensible defaults for optional fields
2. **Validate early**: Check `config.isValid()` at application startup
3. **Use secrets**: Always use `Env.secret()` for sensitive values
4. **Document fields**: Use `description` option to document fields
5. **Environment-specific**: Use multi-environment defaults for different environments
6. **Type safety**: Leverage TypeScript inference - avoid type casting

---

**See Also:**
- [Architecture Guide](./architecture.md) - Internal implementation
- [Examples](./examples/) - Code examples
- [Application Bootstrap](../application/.docs/bootstrap-public-api.md) - Application setup

