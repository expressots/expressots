# Lifecycle Hooks Documentation

Comprehensive documentation for ExpressoTS lifecycle hooks system.

## 📚 Documentation Index

### For Application Developers

- **[Lifecycle Hooks Public API](./lifecycle-public-api.md)** - Complete guide to using lifecycle hooks
  - Bootstrap hooks (`IBootstrap`)
  - Shutdown hooks (`IShutdown`)
  - Lifecycle registry
  - Best practices

### For Framework Developers

- **[Lifecycle Architecture](./architecture.md)** - Internal architecture and design decisions
  - Auto-discovery mechanism
  - Hook execution pipeline
  - Registry implementation
  - Integration with bootstrap

## 🎯 Quick Start

### Bootstrap Hook

Initialize services after the server is ready:

```typescript
import { IBootstrap, provideSingleton } from "@expressots/core";

@provideSingleton(DatabaseService)
export class DatabaseService implements IBootstrap {
  async bootstrap(): Promise<void> {
    await this.connect();
    console.log('Database connected');
  }
}
```

### Shutdown Hook

Clean up resources during application shutdown:

```typescript
import { IShutdown, provideSingleton } from "@expressots/core";

@provideSingleton(CacheService)
export class CacheService implements IShutdown {
  async shutdown(signal?: NodeJS.Signals): Promise<void> {
    if (signal === 'SIGTERM') {
      await this.flushCache(); // Graceful shutdown
    }
    await this.disconnect();
  }
}
```

### Using Both Hooks

Implement both interfaces for complete lifecycle management:

```typescript
@provideSingleton(MessageQueueService)
export class MessageQueueService implements IBootstrap, IShutdown {
  async bootstrap(): Promise<void> {
    await this.connect();
    await this.subscribe();
  }

  async shutdown(signal?: NodeJS.Signals): Promise<void> {
    await this.unsubscribe();
    await this.disconnect();
  }
}
```

## 📖 Documentation Structure

```
.docs/
├── README.md                    # This file
├── lifecycle-public-api.md      # Public API documentation
├── architecture.md              # Framework architecture
├── examples/                    # Runnable examples
│   ├── basic-bootstrap.example.ts
│   ├── basic-shutdown.example.ts
│   └── combined-lifecycle.example.ts
└── diagrams/                    # Visual diagrams
    └── lifecycle-flow.mermaid
```

## 🔗 Related Documentation

- [Application Bootstrap](../application/.docs/bootstrap-public-api.md) - Application initialization
- [Dependency Injection](../di/.docs/) - DI container and scopes
- [Error Handling](../error/.docs/error-public-api.md) - Error handling

## 💡 Key Concepts

- **IBootstrap**: Initialize services after server is ready
- **IShutdown**: Clean up resources during shutdown
- **LifecycleRegistry**: Auto-discovers and executes lifecycle hooks
- **Auto-Discovery**: No manual registration required
- **Parallel Execution**: Hooks execute in parallel for performance

## ⚠️ Important Notes

1. **Use `@provideSingleton()`**: Lifecycle hooks require singleton scope
2. **Bootstrap runs after server ready**: Not during DI container creation
3. **Shutdown is error-tolerant**: Errors don't prevent other hooks from running
4. **Parallel execution**: All hooks of the same type run in parallel

