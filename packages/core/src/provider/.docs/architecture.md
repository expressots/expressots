# Provider Architecture

Internal architecture and design decisions for the ExpressoTS provider system.

## Table of Contents

- [Overview](#overview)
- [Architecture Components](#architecture-components)
- [Provider Discovery](#provider-discovery)
- [Capability Detection](#capability-detection)
- [Health Check System](#health-check-system)
- [Metrics Collection](#metrics-collection)
- [Design Decisions](#design-decisions)

## Overview

The provider system provides:

1. **IProvider**: Base interface with metadata
2. **IHealthCheck**: Health check capability
3. **IMetrics**: Metrics collection capability
4. **IConfigurable**: Configuration validation capability
5. **ProviderRegistry**: Auto-discovery and introspection
6. **ProviderManager**: Provider management API

## Architecture Components

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Providers  │  │   Providers  │  │   Providers  │     │
│  │  (IProvider) │  │ (IHealthCheck│  │   (IMetrics) │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              ProviderManager                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Provider Registration                                │  │
│  │  - Register providers                                 │  │
│  │  - Get providers                                      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              ProviderRegistry                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Discovery Engine                                     │  │
│  │  - Scan @provide() metadata                           │  │
│  │  - Detect capabilities                                │  │
│  │  - Extract metadata                                   │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Health Check Executor                                │  │
│  │  - Execute health checks in parallel                  │  │
│  │  - Aggregate results                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Metrics Collector                                    │  │
│  │  - Collect metrics from providers                     │  │
│  │  - Aggregate in dashboard                            │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Query Cache                                          │  │
│  │  - Cache filtered queries                             │  │
│  │  - Invalidate on discovery                            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Provider Discovery

### Discovery Process

The registry discovers providers by scanning `@provide()` decorator metadata:

```typescript
public discover(): void {
  // Get all @provide() metadata
  const provideMetadata = Reflect.getMetadata(
    METADATA_KEY.provide,
    Reflect
  ) || [];

  for (const metadata of provideMetadata) {
    const target = metadata.implementationType;
    
    // Detect capabilities
    const capabilities = this.detectCapabilities(target);
    
    // Get provider instance (if singleton)
    const providerInstance = this.tryGetInstance(target);
    
    // Extract metadata
    const providerMeta = this.getProviderMetadata(target, providerInstance);
    const decoratorMeta = this.getDecoratorMetadata(target);
    
    // Build ProviderInfo
    const info: ProviderInfo = {
      name: decoratorMeta.name || providerMeta.name || target.name,
      target,
      scope: this.detectScope(target),
      capabilities,
      version: decoratorMeta.version || providerMeta.version,
      description: decoratorMeta.description || providerMeta.description,
      source: this.detectSource(target),
      // ... more metadata
    };
    
    this.providers.set(target, info);
  }
}
```

### Metadata Extraction

**From Instance (IProvider):**
```typescript
private getProviderMetadata(
  target: new (...args: Array<unknown>) => unknown,
  instance: unknown | null
): Partial<IProvider> {
  if (instance && typeof instance === "object") {
    const provider = instance as Partial<IProvider>;
    if (provider.name) {
      return {
        name: provider.name,
        version: provider.version,
        description: provider.description,
        author: provider.author,
        repo: provider.repo
      };
    }
  }
  return { name: target.name };
}
```

**From Decorator (@Provider):**
```typescript
private getDecoratorMetadata(
  target: new (...args: Array<unknown>) => unknown
): Partial<ProviderOptions> {
  const providerMeta = Reflect.getMetadata(
    METADATA_KEY.providerMeta,
    target
  );
  return providerMeta || {};
}
```

## Capability Detection

### Capability Detection Process

Capabilities are detected by checking the prototype for specific methods:

```typescript
private detectCapabilities(
  target: new (...args: Array<unknown>) => unknown
): ProviderCapabilities {
  const proto = target.prototype;
  
  return {
    hasBootstrap: typeof proto.bootstrap === "function",
    hasShutdown: typeof proto.shutdown === "function",
    hasHealthCheck: typeof proto.healthCheck === "function",
    hasMetrics: typeof proto.getMetrics === "function",
    hasConfigurable: typeof proto.configure === "function"
  };
}
```

### Scope Detection

Scope is detected from decorator metadata:

```typescript
private detectScope(
  target: new (...args: Array<unknown>) => unknown
): string {
  // Try decorator metadata
  const scopeFromMeta = Reflect.getMetadata(METADATA_KEY.scope, target);
  if (scopeFromMeta) {
    return scopeFromMeta;
  }
  
  // Try provider options
  const providerMeta = Reflect.getMetadata(
    METADATA_KEY.providerMeta,
    target
  );
  if (providerMeta?.scope) {
    return providerMeta.scope;
  }
  
  // Default to Request scope
  return Scope.Request;
}
```

### Source Detection

Source is detected from decorator metadata:

```typescript
private detectSource(
  target: new (...args: Array<unknown>) => unknown
): ProviderSource {
  const sourceFromMeta = Reflect.getMetadata(METADATA_KEY.source, target);
  if (sourceFromMeta) {
    return sourceFromMeta as ProviderSource;
  }
  
  const providerMeta = Reflect.getMetadata(
    METADATA_KEY.providerMeta,
    target
  );
  if (providerMeta?.source) {
    return providerMeta.source;
  }
  
  // Default to user source
  return "user";
}
```

## Health Check System

### Health Check Execution

Health checks are executed in parallel for performance:

```typescript
public async checkHealth(): Promise<HealthDashboard> {
  const healthProviders = this.getWithCapability("hasHealthCheck");
  
  // Execute all health checks in parallel
  const results = await Promise.all(
    healthProviders.map(async (provider) => {
      try {
        const instance = this.container.get(provider.target);
        if (isHealthCheck(instance)) {
          const result = await Promise.resolve(instance.healthCheck());
          return {
            name: provider.name,
            result: {
              ...result,
              checkedAt: Date.now()
            }
          };
        }
      } catch (error) {
        return {
          name: provider.name,
          result: {
            status: "unhealthy",
            message: error.message
          }
        };
      }
    })
  );
  
  // Determine overall status
  const overall = this.determineOverallStatus(results);
  
  return {
    overall,
    providers: results,
    checkedAt: Date.now()
  };
}
```

### Overall Status Determination

```typescript
private determineOverallStatus(
  results: Array<{ name: string; result: HealthCheckResult }>
): "healthy" | "degraded" | "unhealthy" {
  const statuses = results.map(r => r.result.status);
  
  if (statuses.includes("unhealthy")) {
    return "unhealthy";
  }
  
  if (statuses.includes("degraded")) {
    return "degraded";
  }
  
  return "healthy";
}
```

## Metrics Collection

### Metrics Collection Process

Metrics are collected synchronously from all providers:

```typescript
public collectMetrics(): MetricsDashboard {
  const metricsProviders = this.getWithCapability("hasMetrics");
  const providers: Record<string, ProviderMetrics> = {};
  
  for (const provider of metricsProviders) {
    try {
      const instance = this.container.get(provider.target);
      if (isMetrics(instance)) {
        providers[provider.name] = instance.getMetrics();
      }
    } catch (error) {
      // Log error but continue
      providers[provider.name] = {
        error: error.message
      };
    }
  }
  
  return {
    providers,
    collectedAt: Date.now()
  };
}
```

## Design Decisions

### ADR-001: Auto-Discovery

**Decision:** Use auto-discovery instead of manual registration.

**Rationale:**
- Reduces boilerplate
- Consistent with other auto-discovery patterns
- Less error-prone
- Automatic capability detection

### ADR-002: Parallel Health Checks

**Decision:** Execute health checks in parallel.

**Rationale:**
- Faster overall health check time
- Independent providers don't block each other
- Better resource utilization

### ADR-003: Cached Queries

**Decision:** Cache filtered queries (by scope, capability, source).

**Rationale:**
- Performance: Avoid repeated filtering
- Memory: Caches are small (arrays of references)
- Invalidation: Cleared on discovery

### ADR-004: Capability Detection

**Decision:** Detect capabilities from prototype methods.

**Rationale:**
- No need for explicit capability registration
- Works with any provider implementation
- Type-safe with type guards

### ADR-005: Source Tracking

**Decision:** Track provider source (builtin, user, external).

**Rationale:**
- Better introspection
- Useful for debugging
- Enables source-based filtering

## Related Code

- [ProviderRegistry](../provider-registry.ts) - Registry implementation
- [ProviderManager](../provider-manager.ts) - Manager implementation
- [Provider Interfaces](../provider.interface.ts) - Interface definitions
- [DI Container](../di/) - Dependency injection

