# Provider Documentation

Comprehensive documentation for ExpressoTS provider system.

## 📚 Documentation Index

### For Application Developers

- **[Provider Public API](./provider-public-api.md)** - Complete guide to using providers
  - Creating providers
  - Health checks
  - Metrics collection
  - Configuration validation
  - Provider introspection

### For Framework Developers

- **[Provider Architecture](./architecture.md)** - Internal architecture and design decisions
  - Provider registry
  - Auto-discovery mechanism
  - Health check system
  - Metrics collection

## 🎯 Quick Start

### Basic Provider

Create a provider with metadata:

```typescript
import { IProvider, provideSingleton } from "@expressots/core";

@provideSingleton(DatabaseProvider)
export class DatabaseProvider implements IProvider {
  readonly name = "Database Provider";
  readonly version = "1.0.0";
  readonly description = "PostgreSQL connection manager";
}
```

### Provider with Health Check

Add health check capability:

```typescript
import { IProvider, IHealthCheck, HealthCheckResult, provideSingleton } from "@expressots/core";

@provideSingleton(CacheProvider)
export class CacheProvider implements IProvider, IHealthCheck {
  readonly name = "Cache Provider";
  
  async healthCheck(): Promise<HealthCheckResult> {
    const pingStart = Date.now();
    const isAlive = await this.redis.ping();
    return {
      status: isAlive ? 'healthy' : 'unhealthy',
      latency: Date.now() - pingStart
    };
  }
}
```

### Provider with Metrics

Expose metrics from your provider:

```typescript
import { IProvider, IMetrics, ProviderMetrics, provideSingleton } from "@expressots/core";

@provideSingleton(ConnectionPoolProvider)
export class ConnectionPoolProvider implements IProvider, IMetrics {
  readonly name = "Connection Pool Provider";
  
  getMetrics(): ProviderMetrics {
    return {
      'pool.active': this.pool.activeConnections,
      'pool.idle': this.pool.idleConnections,
      'queries.total': this.stats.totalQueries
    };
  }
}
```

## 📖 Documentation Structure

```
.docs/
├── README.md                    # This file
├── provider-public-api.md       # Public API documentation
├── architecture.md              # Framework architecture
├── examples/                    # Runnable examples
│   ├── basic-provider.example.ts
│   ├── health-check-provider.example.ts
│   └── metrics-provider.example.ts
└── diagrams/                    # Visual diagrams
    └── provider-discovery.mermaid
```

## 🔗 Related Documentation

- [Dependency Injection](../di/.docs/) - DI container and scopes
- [Lifecycle Hooks](../lifecycle/.docs/lifecycle-public-api.md) - Bootstrap and shutdown hooks
- [Application Bootstrap](../application/.docs/bootstrap-public-api.md) - Application initialization

## 💡 Key Concepts

- **IProvider**: Base interface with metadata
- **IHealthCheck**: Health check capability
- **IMetrics**: Metrics collection capability
- **IConfigurable**: Configuration validation capability
- **ProviderRegistry**: Auto-discovery and introspection
- **ProviderManager**: Provider management API

## ⚠️ Important Notes

1. **Auto-Discovery**: Providers are automatically discovered from `@provide()` decorators
2. **Capabilities**: Implement interfaces to enable capabilities (health, metrics, config)
3. **Source Tracking**: Providers are tracked by source (builtin, user, external)
4. **Parallel Execution**: Health checks execute in parallel for performance

