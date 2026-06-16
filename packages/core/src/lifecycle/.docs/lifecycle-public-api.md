# Lifecycle Hooks Public API

Complete guide to lifecycle hooks in ExpressoTS applications.

## Table of Contents

- [Quick Start](#quick-start)
- [Bootstrap Hooks](#bootstrap-hooks)
- [Shutdown Hooks](#shutdown-hooks)
- [Lifecycle Registry](#lifecycle-registry)
- [Best Practices](#best-practices)
- [Advanced Patterns](#advanced-patterns)
- [Troubleshooting](#troubleshooting)

## Quick Start

ExpressoTS provides lifecycle hooks for initialization and cleanup:

- **IBootstrap**: Initialize services after the server is ready
- **IShutdown**: Clean up resources during application shutdown
- **Auto-Discovery**: Hooks are automatically discovered and executed

### Basic Usage

```typescript
import { IBootstrap, IShutdown, provideSingleton } from "@expressots/core";

@provideSingleton(MyService)
export class MyService implements IBootstrap, IShutdown {
  async bootstrap(): Promise<void> {
    // Initialize after server is ready
    await this.initialize();
  }

  async shutdown(signal?: NodeJS.Signals): Promise<void> {
    // Cleanup during shutdown
    await this.cleanup();
  }
}
```

## Bootstrap Hooks

### IBootstrap Interface

Implement `IBootstrap` to run initialization code after the application is fully ready.

```typescript
interface IBootstrap {
  bootstrap(): void | Promise<void>;
}
```

**When is `bootstrap()` called?**
- After the server is fully ready and listening
- After `postServerInitialization()` completes
- Before accepting requests
- All bootstrap hooks execute in parallel

**Important**: Use `@provideSingleton()` for providers implementing `IBootstrap`.

### Examples

**Database Connection**
```typescript
import { IBootstrap, provideSingleton } from "@expressots/core";

@provideSingleton(DatabaseService)
export class DatabaseService implements IBootstrap {
  private connection: Connection;

  async bootstrap(): Promise<void> {
    this.connection = await this.connect();
    console.log('Database connected');
  }

  private async connect(): Promise<Connection> {
    // Connection logic
  }
}
```

**Cache Warming**
```typescript
@provideSingleton(CacheService)
export class CacheService implements IBootstrap {
  async bootstrap(): Promise<void> {
    await this.warmCache();
    console.log('Cache warmed');
  }

  private async warmCache(): Promise<void> {
    // Warm cache logic
  }
}
```

**Multiple Initializations**
```typescript
@provideSingleton(MessageQueueService)
export class MessageQueueService implements IBootstrap {
  async bootstrap(): Promise<void> {
    // All these run in parallel with other bootstrap hooks
    await Promise.all([
      this.connect(),
      this.subscribe(),
      this.loadConfiguration()
    ]);
  }
}
```

### Bootstrap Execution Order

1. Server starts and becomes ready
2. `postServerInitialization()` completes
3. All `bootstrap()` hooks execute in parallel
4. Application ready to accept requests

## Shutdown Hooks

### IShutdown Interface

Implement `IShutdown` to run cleanup code when the application shuts down.

```typescript
interface IShutdown {
  shutdown(signal?: NodeJS.Signals): void | Promise<void>;
}
```

**When is `shutdown()` called?**
- During application shutdown (SIGTERM, SIGINT, etc.)
- Called with the signal that triggered shutdown
- All shutdown hooks execute in parallel
- Errors are logged but don't prevent other hooks from executing

**Important**: Use `@provideSingleton()` for providers implementing `IShutdown`.

### Examples

**Basic Cleanup**
```typescript
import { IShutdown, provideSingleton } from "@expressots/core";

@provideSingleton(DatabaseService)
export class DatabaseService implements IShutdown {
  async shutdown(signal?: NodeJS.Signals): Promise<void> {
    await this.closeConnections();
    console.log('Database disconnected');
  }
}
```

**Signal-Based Cleanup**
```typescript
@provideSingleton(CacheService)
export class CacheService implements IShutdown {
  async shutdown(signal?: NodeJS.Signals): Promise<void> {
    if (signal === 'SIGTERM') {
      // Graceful shutdown - finish current operations
      await this.finishPendingOperations();
      await this.flushCache();
    } else {
      // Immediate shutdown
      await this.closeConnections();
    }
  }
}
```

**Resource Cleanup**
```typescript
@provideSingleton(FileService)
export class FileService implements IShutdown {
  private fileHandles: FileHandle[] = [];

  async shutdown(signal?: NodeJS.Signals): Promise<void> {
    // Close all file handles
    await Promise.all(
      this.fileHandles.map(handle => handle.close())
    );
    this.fileHandles = [];
  }
}
```

### Shutdown Signals

Common shutdown signals:

- **SIGTERM**: Graceful shutdown (default in production)
- **SIGINT**: Interrupt signal (Ctrl+C)
- **SIGUSR2**: Custom signal (often used for reload)

### Shutdown Execution Behavior

- All `shutdown()` hooks execute in parallel
- Errors are logged but don't stop execution
- Each hook receives the shutdown signal
- Framework waits for all hooks to complete

## Lifecycle Registry

### Auto-Discovery

The `LifecycleRegistry` automatically discovers providers implementing lifecycle interfaces.

```typescript
import { LifecycleRegistry } from "@expressots/core";

const registry = new LifecycleRegistry(container);
registry.discover();

// Execute bootstrap hooks
await registry.executeBootstrap();

// Later, execute shutdown hooks
await registry.executeShutdown('SIGTERM');
```

### Manual Usage

**Discovery**
```typescript
const registry = new LifecycleRegistry(container);
registry.discover();

// Check counts
console.log(`Bootstrap providers: ${registry.getBootstrapCount()}`);
console.log(`Shutdown providers: ${registry.getShutdownCount()}`);
```

**Execution**
```typescript
// Execute bootstrap (called automatically by framework)
await registry.executeBootstrap();

// Execute shutdown (called automatically by framework)
await registry.executeShutdown('SIGTERM');
```

### Registry Methods

**discover()**
- Scans all `@provide()` decorated classes
- Checks for `IBootstrap` and `IShutdown` implementations
- Stores providers for execution
- Idempotent (safe to call multiple times)

**executeBootstrap()**
- Executes all `bootstrap()` hooks in parallel
- Throws error if any hook fails (fail-fast)
- Waits for all hooks to complete

**executeShutdown(signal?)**
- Executes all `shutdown()` hooks in parallel
- Passes shutdown signal to each hook
- Errors are logged but don't stop execution
- Waits for all hooks to complete

**getBootstrapCount()**
- Returns number of discovered bootstrap providers

**getShutdownCount()**
- Returns number of discovered shutdown providers

## Best Practices

### 1. Use Singleton Scope

Always use `@provideSingleton()` for lifecycle hooks:

```typescript
// ✅ Correct
@provideSingleton(MyService)
export class MyService implements IBootstrap {}

// ❌ Incorrect
@provideTransient(MyService)  // Won't work correctly
export class MyService implements IBootstrap {}
```

### 2. Handle Errors Gracefully

**Bootstrap**: Fail fast if initialization is critical
```typescript
async bootstrap(): Promise<void> {
  try {
    await this.connect();
  } catch (error) {
    // Log and re-throw - bootstrap will fail
    this.logger.error('Failed to connect', error);
    throw error;
  }
}
```

**Shutdown**: Log errors but don't throw
```typescript
async shutdown(signal?: NodeJS.Signals): Promise<void> {
  try {
    await this.cleanup();
  } catch (error) {
    // Log but don't throw - other hooks should still run
    this.logger.error('Cleanup failed', error);
  }
}
```

### 3. Use Async/Await

Prefer async/await for cleaner code:

```typescript
// ✅ Preferred
async bootstrap(): Promise<void> {
  await this.connect();
  await this.initialize();
}

// ⚠️ Works but less readable
bootstrap(): Promise<void> {
  return this.connect().then(() => this.initialize());
}
```

### 4. Parallel Initialization

Initialize independent services in parallel:

```typescript
async bootstrap(): Promise<void> {
  // These run in parallel
  await Promise.all([
    this.connectDatabase(),
    this.connectCache(),
    this.connectMessageQueue()
  ]);
}
```

### 5. Signal-Aware Shutdown

Handle different shutdown signals appropriately:

```typescript
async shutdown(signal?: NodeJS.Signals): Promise<void> {
  if (signal === 'SIGTERM') {
    // Graceful shutdown
    await this.finishPendingWork();
  }
  
  // Always cleanup
  await this.cleanup();
}
```

## Advanced Patterns

### Combined Lifecycle

Implement both interfaces for complete lifecycle management:

```typescript
@provideSingleton(MessageQueueService)
export class MessageQueueService implements IBootstrap, IShutdown {
  private connection: Connection;

  async bootstrap(): Promise<void> {
    this.connection = await this.connect();
    await this.subscribe();
  }

  async shutdown(signal?: NodeJS.Signals): Promise<void> {
    await this.unsubscribe();
    await this.disconnect();
  }
}
```

### Conditional Initialization

Initialize based on environment or configuration:

```typescript
@provideSingleton(FeatureService)
export class FeatureService implements IBootstrap {
  async bootstrap(): Promise<void> {
    if (process.env.ENABLE_FEATURE === 'true') {
      await this.enableFeature();
    }
  }
}
```

### Dependency Injection in Hooks

Use injected dependencies in lifecycle hooks:

```typescript
@provideSingleton(MyService)
export class MyService implements IBootstrap {
  constructor(
    @inject(Logger) private logger: Logger,
    @inject(Config) private config: Config
  ) {}

  async bootstrap(): Promise<void> {
    this.logger.info('Initializing service', 'MyService');
    await this.initialize(this.config.get('service.url'));
  }
}
```

### Timeout Handling

Add timeouts to prevent hanging:

```typescript
async bootstrap(): Promise<void> {
  await Promise.race([
    this.connect(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), 5000)
    )
  ]);
}
```

## Troubleshooting

### Bootstrap Hook Not Executing

**Problem:** `bootstrap()` method is not being called.

**Solutions:**
1. Ensure provider uses `@provideSingleton()`
2. Verify provider implements `IBootstrap` interface
3. Check that `LifecycleRegistry.discover()` is called
4. Verify `executeBootstrap()` is called after server ready

### Shutdown Hook Not Executing

**Problem:** `shutdown()` method is not being called.

**Solutions:**
1. Ensure provider uses `@provideSingleton()`
2. Verify provider implements `IShutdown` interface
3. Check that `LifecycleRegistry.discover()` is called
4. Verify `executeShutdown()` is called during shutdown

### Multiple Instances Created

**Problem:** Multiple instances of service are created.

**Solution:** Use `@provideSingleton()` instead of `@provideTransient()`:

```typescript
// ✅ Correct
@provideSingleton(MyService)
export class MyService implements IBootstrap {}

// ❌ Wrong - creates new instance for lifecycle hook
@provideTransient(MyService)
export class MyService implements IBootstrap {}
```

### Bootstrap Fails But Server Starts

**Problem:** Bootstrap hook fails but server continues to start.

**Explanation:** This shouldn't happen - bootstrap failures should prevent server startup.

**Solution:** Check error handling in bootstrap hook:

```typescript
async bootstrap(): Promise<void> {
  try {
    await this.connect();
  } catch (error) {
    // Re-throw to fail bootstrap
    throw error;
  }
}
```

### Shutdown Hooks Not Completing

**Problem:** Shutdown hooks don't complete before process exits.

**Solution:** Ensure async hooks return promises:

```typescript
// ✅ Correct
async shutdown(signal?: NodeJS.Signals): Promise<void> {
  await this.cleanup();
}

// ❌ Wrong - cleanup might not complete
shutdown(signal?: NodeJS.Signals): void {
  this.cleanup(); // Missing await
}
```

## Common Patterns

### Database Service

```typescript
@provideSingleton(DatabaseService)
export class DatabaseService implements IBootstrap, IShutdown {
  private pool: Pool;

  async bootstrap(): Promise<void> {
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await this.pool.connect();
  }

  async shutdown(signal?: NodeJS.Signals): Promise<void> {
    await this.pool.end();
  }
}
```

### Cache Service

```typescript
@provideSingleton(CacheService)
export class CacheService implements IBootstrap, IShutdown {
  private client: RedisClient;

  async bootstrap(): Promise<void> {
    this.client = createClient({ url: process.env.REDIS_URL });
    await this.client.connect();
    await this.warmCache();
  }

  async shutdown(signal?: NodeJS.Signals): Promise<void> {
    if (signal === 'SIGTERM') {
      await this.flushCache();
    }
    await this.client.quit();
  }
}
```

### Message Queue Service

```typescript
@provideSingleton(MessageQueueService)
export class MessageQueueService implements IBootstrap, IShutdown {
  private connection: Connection;
  private channel: Channel;

  async bootstrap(): Promise<void> {
    this.connection = await amqp.connect(process.env.AMQP_URL);
    this.channel = await this.connection.createChannel();
    await this.setupQueues();
  }

  async shutdown(signal?: NodeJS.Signals): Promise<void> {
    await this.channel.close();
    await this.connection.close();
  }
}
```

