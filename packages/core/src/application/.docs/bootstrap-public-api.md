# Application Bootstrap - Public API

> 🎯 **Goal**: Start your ExpressoTS application in seconds with zero configuration

## Quick Start

```typescript
import { bootstrap } from "@expressots/core";
import { App } from "./app";

await bootstrap(App);
```

**That's it!** Your app is running on port 3000.

---

## Progressive Enhancement

### Level 1: Custom Port

```typescript
await bootstrap(App, { port: 8080 });
```

### Level 2: Environment Files

```typescript
await bootstrap(App, {
  currentEnvironment: "development",
  envFileConfig: {
    autoCreateTemplate: true,
    required: ["DATABASE_URL"],
  },
});
```

### Level 3: Production Ready

```typescript
await bootstrap(App, {
  currentEnvironment: "production",
  envFileConfig: {
    files: {
      development: ".env.dev",
      production: ".env.prod",
    },
    required: ["DATABASE_URL", "JWT_SECRET", "API_KEY"],
    validateValues: true,
  },
});
```

---

## Visual Decision Trees

### "Should I use envFileConfig?"

```
Do you need environment variables?
├─ No → Skip envFileConfig entirely
└─ Yes
   ├─ Only from process.env (Docker, CI) → skipFileLoading: true
   └─ From .env files
      ├─ Single environment → Default convention (.env.{env})
      └─ Multiple environments → Custom files mapping
```

### "Which port configuration should I use?"

```
Port Configuration
├─ Default (3000) → No port option needed
├─ Custom port → { port: 8080 }
├─ From .env → Set PORT in .env file
└─ Testing → { port: 0 } (OS-assigned)
```

---

## Real-World Scenarios

### 🏢 Scenario: Microservice in Kubernetes

**Challenge**: Variables come from K8s ConfigMaps/Secrets

```typescript
await bootstrap(App, {
  envFileConfig: {
    skipFileLoading: true, // Use process.env only
    required: ["DATABASE_URL", "REDIS_URL"],
  },
});
```

### 🧪 Scenario: Integration Testing

**Challenge**: Need parallel tests with random ports

```typescript
const server = await bootstrap(App, {
  port: 0, // Auto-assign available port
});
const actualPort = server.port; // Use this for tests
```

### 🚀 Scenario: GitHub Actions Deployment

**Challenge**: CI fails with missing .env file

```typescript
// Automatically detected! No config needed.
// Or explicitly:
await bootstrap(App, {
  envFileConfig: {
    ciMode: true, // Skip file loading, validate process.env
    required: ["DATABASE_URL"],
  },
});
```

### 🏗️ Scenario: Multi-Environment Setup

**Challenge**: Different configs for dev, staging, production

```typescript
await bootstrap(App, {
  currentEnvironment: process.env.NODE_ENV || "development",
  envFileConfig: {
    files: {
      development: ".env.dev",
      staging: ".env.staging",
      production: ".env.prod",
    },
    required: ["DATABASE_URL", "JWT_SECRET"],
    autoCreateTemplate: true, // Creates missing files
    validateValues: process.env.NODE_ENV === "production",
  },
});
```

---

## API Reference

### `bootstrap(AppClass, options?)`

Bootstrap your ExpressoTS application.

**Parameters:**

- `AppClass` - Your application class extending `AppExpress`
- `options` - Optional configuration (see below)

**Returns:** `Promise<IWebServerPublic>`

### `BootstrapOptions`

#### `port?: number`

Port to listen on.

- **Default**: `process.env.PORT ?? 3000`
- **Special**: Use `0` for OS-assigned port (testing)
- **Priority**: `options.port` > `process.env.PORT` > `3000`

#### `appName?: string`

Override application name.

- **Default**: `package.json` name
- **Used in**: Startup banner and logs

#### `appVersion?: string`

Override application version.

- **Default**: `package.json` version
- **Used in**: Startup banner and logs

#### `currentEnvironment?: EnvironmentName`

Current environment name.

- **Default**: `process.env.NODE_ENV ?? "development"`
- **Determines**: Which .env file to load
- **Values**: `"development" | "production" | "staging" | "test" | "local" | string`

#### `envFileConfig?: EnvironmentFileConfig`

Environment file loading configuration (opt-in).

**Important**: If not provided, .env file loading is skipped entirely.

##### `files?: EnvironmentFileMap`

Custom mapping of environment names to .env file names.

```typescript
files: {
  development: ".env.dev",
  production: ".env.prod",
  staging: ".env.staging"
}
```

**Default**: Uses convention `.env.{currentEnvironment}`

##### `validateFile?: boolean`

Validate that the required .env file exists.

- **Default**: `true` locally, `false` in CI
- **Behavior**: Throws error if file is missing

##### `validateValues?: boolean`

Validate that all variables have non-empty values.

- **Default**: `true` in production/CI, `false` in development
- **Behavior**: Throws error if any variable is empty

##### `autoCreateTemplate?: boolean`

Auto-create template .env file if missing.

- **Default**: `false` (opt-in behavior)
- **Creates**: Template with `PORT=3000`, `NODE_ENV={env}`, and required variables

##### `required?: ReadonlyArray<string>`

Required environment variable names.

- **Always validated** (even if `validateValues: false`)
- **Added to template** when auto-creating files

##### `ciMode?: boolean`

Force CI/CD mode.

- **Skips**: .env file loading
- **Validates**: Variables from `process.env` only
- **Never**: Creates template files

##### `skipFileLoading?: boolean`

Skip .env file loading entirely.

- **Uses**: Only `process.env` variables
- **Ignores**: All .env files
- **Still validates**: Required variables from `process.env`

---

## Common Patterns

### Pattern 1: Zero Config (Recommended for Start)

```typescript
await bootstrap(App);
```

### Pattern 2: Development with Auto-Creation

```typescript
await bootstrap(App, {
  currentEnvironment: "development",
  envFileConfig: {
    autoCreateTemplate: true,
    required: ["DATABASE_URL"],
  },
});
```

### Pattern 3: Production with Validation

```typescript
await bootstrap(App, {
  currentEnvironment: "production",
  envFileConfig: {
    files: {
      production: ".env.prod",
    },
    required: ["DATABASE_URL", "JWT_SECRET", "API_KEY"],
    validateValues: true,
  },
});
```

### Pattern 4: Containerized Deployment

```typescript
await bootstrap(App, {
  envFileConfig: {
    skipFileLoading: true,
    required: ["DATABASE_URL", "REDIS_URL"],
  },
});
```

### Pattern 5: Testing

```typescript
const server = await bootstrap(App, {
  port: 0,
  envFileConfig: {
    skipFileLoading: true,
  },
});

// Use server.port in your tests
expect(server.port).toBeGreaterThan(0);
```

---

## Troubleshooting

### ❌ Port Already in Use

**Error**: `EADDRINUSE: address already in use`

**Solutions**:

- Use `port: 0` for testing (auto-assign)
- Change port: `{ port: 8080 }`
- Set `PORT` in environment

### ❌ Missing .env File

**Error**: `Missing required environment file: .env.development`

**Solutions**:

- Set `autoCreateTemplate: true` to auto-create
- Create the file manually
- Use `skipFileLoading: true` if using process.env only

### ❌ CI Validation Fails

**Error**: `CI/CD Environment Validation Failed`

**Solutions**:

- Add missing variables to CI/CD platform secrets
- Check variable names match exactly (case-sensitive)
- See platform-specific hints in error message

### ❌ Empty Environment Variables

**Error**: `Environment validation failed - Missing values`

**Solutions**:

- Fill in empty values in .env file
- Remove from `required` array if optional
- Set `validateValues: false` (not recommended for production)

---

## Best Practices

1. **Start Simple**: Use zero-config `bootstrap(App)` initially
2. **Opt-in Gradually**: Add `envFileConfig` when you need it
3. **Validate in Production**: Always set `validateValues: true` for production
4. **Use Port 0 for Tests**: Enables parallel test execution
5. **Skip Files in Containers**: Use `skipFileLoading: true` in Docker/K8s
6. **Auto-Create in Dev**: Set `autoCreateTemplate: true` for better DX

---

## Related Documentation

- [Architecture Guide](./architecture.md) - For framework developers
- [Decision Log](./decision-log.md) - Why things are the way they are
- [Examples](./examples/) - Runnable code examples
