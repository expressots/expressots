# Provider Public API

Complete guide to providers in ExpressoTS applications.

## Table of Contents

- [Quick Start](#quick-start)
- [Creating Providers](#creating-providers)
- [Health Checks](#health-checks)
- [Metrics Collection](#metrics-collection)
- [Configuration Validation](#configuration-validation)
- [Provider Introspection](#provider-introspection)
- [Best Practices](#best-practices)

## Quick Start

ExpressoTS providers are services that can implement optional capabilities:

- **IProvider**: Base interface with metadata
- **IHealthCheck**: Health check capability
- **IMetrics**: Metrics collection capability
- **IConfigurable**: Configuration validation capability

### Basic Provider

```typescript
import { IProvider, provideSingleton } from "@expressots/core";

@provideSingleton(DatabaseProvider)
export class DatabaseProvider implements IProvider {
  readonly name = "Database Provider";
  readonly version = "1.0.0";
  readonly description = "PostgreSQL connection manager";
  readonly author = "ExpressoTS Team";
  readonly repo = "https://github.com/expressots/expressots";
}
```

## Creating Providers

### Provider Interface

The `IProvider` interface provides metadata about your provider:

```typescript
interface IProvider {
  readonly name: string;           // Display name
  readonly version?: string;        // Semantic version
  readonly description?: string;    // Brief description
  readonly author?: string;         // Author name or organization
  readonly repo?: string;           // Repository URL
}
```

### Example

```typescript
@provideSingleton(EmailProvider)
export class EmailProvider implements IProvider {
  readonly name = "Email Provider";
  readonly version = "2.1.0";
  readonly description = "SMTP email sending service";
  readonly author = "My Company";
  readonly repo = "https://github.com/mycompany/email-provider";
}
```

## Health Checks

### IHealthCheck Interface

Implement `IHealthCheck` to enable health checks for your provider:

```typescript
interface IHealthCheck {
  healthCheck(): HealthCheckResult | Promise<HealthCheckResult>;
}
```

### HealthCheckResult

```typescript
interface HealthCheckResult {
  status: "healthy" | "degraded" | "unhealthy";
  latency?: number;              // Milliseconds
  message?: string;              // Status message
  details?: Record<string, unknown>; // Additional details
  checkedAt?: number;            // Timestamp
}
```

### Examples

**Database Provider:**
```typescript
@provideSingleton(DatabaseProvider)
export class DatabaseProvider implements IProvider, IHealthCheck {
  readonly name = "Database Provider";
  
  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      await this.pool.query("SELECT 1");
      return {
        status: "healthy",
        latency: Date.now() - start,
        details: {
          connections: this.pool.totalCount,
          idle: this.pool.idleCount
        }
      };
    } catch (error) {
      return {
        status: "unhealthy",
        latency: Date.now() - start,
        message: error.message
      };
    }
  }
}
```

**Cache Provider:**
```typescript
@provideSingleton(CacheProvider)
export class CacheProvider implements IProvider, IHealthCheck {
  readonly name = "Cache Provider";
  
  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();
    const isAlive = await this.redis.ping();
    const latency = Date.now() - start;
    
    return {
      status: isAlive ? "healthy" : "unhealthy",
      latency,
      details: {
        connected: isAlive,
        memory: await this.redis.info("memory")
      }
    };
  }
}
```

**Degraded Status:**
```typescript
async healthCheck(): Promise<HealthCheckResult> {
  const responseTime = await this.measureResponseTime();
  
  if (responseTime > 1000) {
    return {
      status: "degraded",
      latency: responseTime,
      message: "High response time detected"
    };
  }
  
  return {
    status: "healthy",
    latency: responseTime
  };
}
```

## Metrics Collection

### IMetrics Interface

Implement `IMetrics` to expose metrics from your provider:

```typescript
interface IMetrics {
  getMetrics(): ProviderMetrics;
}

type ProviderMetrics = Record<string, number | string | boolean>;
```

### Examples

**Connection Pool Provider:**
```typescript
@provideSingleton(ConnectionPoolProvider)
export class ConnectionPoolProvider implements IProvider, IMetrics {
  readonly name = "Connection Pool Provider";
  
  getMetrics(): ProviderMetrics {
    return {
      "pool.active": this.pool.activeConnections,
      "pool.idle": this.pool.idleConnections,
      "pool.total": this.pool.totalConnections,
      "queries.total": this.stats.totalQueries,
      "queries.failed": this.stats.failedQueries,
      "avg.query.time": this.stats.averageQueryTime
    };
  }
}
```

**Cache Provider:**
```typescript
@provideSingleton(CacheProvider)
export class CacheProvider implements IProvider, IMetrics {
  readonly name = "Cache Provider";
  
  getMetrics(): ProviderMetrics {
    return {
      "cache.hits": this.stats.hits,
      "cache.misses": this.stats.misses,
      "cache.size": this.cache.size,
      "cache.hit.rate": this.stats.hitRate,
      "memory.used": this.getMemoryUsage()
    };
  }
}
```

## Configuration Validation

### IConfigurable Interface

Implement `IConfigurable` to validate provider configuration:

```typescript
interface IConfigurable<TConfig = unknown> {
  configure(config: TConfig): ConfigurationResult;
}

interface ConfigurationResult {
  valid: boolean;
  errors?: Array<string>;
  warnings?: Array<string>;
}
```

### Examples

**Email Provider:**
```typescript
interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  username: string;
  password: string;
}

@provideSingleton(EmailProvider)
export class EmailProvider implements IProvider, IConfigurable<EmailConfig> {
  readonly name = "Email Provider";
  private config?: EmailConfig;
  
  configure(config: EmailConfig): ConfigurationResult {
    const errors: Array<string> = [];
    const warnings: Array<string> = [];
    
    if (!config.smtpHost) {
      errors.push("SMTP host is required");
    }
    
    if (!config.smtpPort || config.smtpPort < 1 || config.smtpPort > 65535) {
      errors.push("SMTP port must be between 1 and 65535");
    }
    
    if (!config.username) {
      errors.push("Username is required");
    }
    
    if (!config.password) {
      warnings.push("Password not provided - using environment variable");
    }
    
    if (errors.length > 0) {
      return { valid: false, errors, warnings };
    }
    
    this.config = config;
    return { valid: true, warnings };
  }
}
```

## Provider Introspection

### ProviderManager

Use `ProviderManager` to introspect providers:

```typescript
const manager = new ProviderManager(container);
manager.discover();

// Get all providers
const providers = manager.getAll();

// Get providers by scope
const singletons = manager.getByScope("Singleton");

// Get providers with health checks
const healthProviders = manager.getWithCapability("hasHealthCheck");

// Get providers by source
const builtin = manager.getBuiltinProviders();
const user = manager.getUserProviders();
const external = manager.getExternalProviders();
```

### Health Dashboard

Get aggregated health check results:

```typescript
const health = await manager.checkHealth();

console.log(health.overall); // "healthy" | "degraded" | "unhealthy"
console.log(health.providers); // Array of provider health results
```

### Metrics Dashboard

Get aggregated metrics:

```typescript
const metrics = manager.collectMetrics();

console.log(metrics.providers); // Record<string, ProviderMetrics>
```

## Best Practices

### 1. Implement IProvider

Always implement `IProvider` for better introspection:

```typescript
@provideSingleton(MyProvider)
export class MyProvider implements IProvider {
  readonly name = "My Provider";
  readonly version = "1.0.0";
  readonly description = "What this provider does";
}
```

### 2. Health Checks for Critical Services

Implement health checks for services that external systems depend on:

```typescript
@provideSingleton(DatabaseProvider)
export class DatabaseProvider implements IProvider, IHealthCheck {
  // ... health check implementation
}
```

### 3. Metrics for Monitoring

Expose metrics for services you want to monitor:

```typescript
@provideSingleton(CacheProvider)
export class CacheProvider implements IProvider, IMetrics {
  // ... metrics implementation
}
```

### 4. Configuration Validation

Validate configuration before using it:

```typescript
@provideSingleton(EmailProvider)
export class EmailProvider implements IProvider, IConfigurable<EmailConfig> {
  configure(config: EmailConfig): ConfigurationResult {
    // Validate and store config
  }
}
```

### 5. Combine Capabilities

Implement multiple capabilities as needed:

```typescript
@provideSingleton(FullFeaturedProvider)
export class FullFeaturedProvider 
  implements IProvider, IHealthCheck, IMetrics, IConfigurable<Config> {
  // ... all capabilities
}
```

## Troubleshooting

### Health Check Not Running

**Problem:** Health check is not being executed.

**Solutions:**
1. Ensure provider implements `IHealthCheck`
2. Call `manager.discover()` after container initialization
3. Verify provider is registered in container

### Metrics Not Collected

**Problem:** Metrics are not being collected.

**Solutions:**
1. Ensure provider implements `IMetrics`
2. Call `manager.discover()` after container initialization
3. Check that `getMetrics()` returns valid data

### Configuration Not Validated

**Problem:** Configuration validation is not running.

**Solutions:**
1. Ensure provider implements `IConfigurable`
2. Call `configure()` method before using provider
3. Check validation result for errors

