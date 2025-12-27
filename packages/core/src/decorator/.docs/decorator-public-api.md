# Scope Binding Decorators - Public API

> 🎯 **Goal**: Register services with dependency injection using scope-aware decorators

## Quick Start

```typescript
import { provide, provideSingleton, provideTransient } from "@expressots/core";

// Request-scoped (default)
provide(IService)
export class MyService { }

// Singleton-scoped
provideSingleton(IService)
export class CacheService { }

// Transient-scoped
provideTransient(IService)
export class PrototypeService { }
```

---

## Progressive Enhancement

### Level 1: Request Scope (Default)

```typescript
provide(IService)
export class MyService { }
```

### Level 2: Singleton Scope

```typescript
provideSingleton(IService)
export class CacheService { }
```

### Level 3: Custom Scope

```typescript
provideInScope(ITenantService, "tenant")
export class TenantService { }
```

### Level 4: Rich Metadata

```typescript
@Provider({
  scope: "Singleton",
  name: "Redis Cache",
  version: "1.0.0",
  description: "Redis caching provider"
})
export class RedisCacheProvider { }
```

---

## API Reference

### `provide(identifier)`

Provides a request-scoped binding.

**Parameters:**

- `identifier` - Service identifier (symbol, string, or class)

**Scope:** Request (one instance per HTTP request)

**Example:**

```typescript
provide(IService)
export class MyService { }
```

### `provideSingleton(identifier, source?)`

Provides a singleton-scoped binding.

**Parameters:**

- `identifier` - Service identifier
- `source` - Optional provider source (default: "user")

**Scope:** Singleton (one instance for app lifetime)

**Example:**

```typescript
provideSingleton(ICache)
export class CacheService { }
```

### `provideTransient(identifier, source?)`

Provides a transient-scoped binding.

**Parameters:**

- `identifier` - Service identifier
- `source` - Optional provider source (default: "user")

**Scope:** Transient (new instance every time)

**Example:**

```typescript
provideTransient(IPrototype)
export class PrototypeService { }
```

### `provideInScope(identifier, scopeName, source?)`

Provides a custom-scoped binding.

**Parameters:**

- `identifier` - Service identifier
- `scopeName` - Custom scope name (e.g., "tenant", "transaction")
- `source` - Optional provider source (default: "user")

**Scope:** Custom (shared within scope context)

**Example:**

```typescript
provideInScope(ITenantService, "tenant")
export class TenantService { }
```

**Note:** Cannot use built-in scope names ("Singleton", "Request", "Transient"). Use corresponding decorators instead.

### `@Provider(options)`

Provider decorator with rich metadata support.

**Parameters:**

- `options` - Provider configuration (see `ProviderOptions`)

**Example:**

```typescript
@Provider({
  scope: "Singleton",
  name: "My Provider",
  version: "1.0.0",
  description: "Provides caching",
  author: "My Team",
  dependencies: ["DatabaseProvider"]
})
export class MyProvider { }
```

---

## Binding Scopes

### Request Scope (Default)

```typescript
provide(IService)
export class MyService { }
```

**Behavior:**
- One instance per HTTP request
- Stateless and scalable
- Recommended for most services

### Singleton Scope

```typescript
provideSingleton(IService)
export class MyService { }
```

**Behavior:**
- One instance for application lifetime
- Shared state across requests
- Use for stateless services or caches

### Transient Scope

```typescript
provideTransient(IService)
export class MyService { }
```

**Behavior:**
- New instance every time
- No caching
- Use sparingly (performance impact)

### Custom Scope

```typescript
provideInScope(IService, "tenant")
export class MyService { }
```

**Behavior:**
- Instances shared within same scope context
- Different instances for different scope values
- Useful for multi-tenant or transaction-scoped services

---

## Real-World Scenarios

### 🏢 Scenario: Multi-Tenant Service

```typescript
provideInScope(IPermissionService, "tenant")
export class PermissionService {
  // One instance per tenant
  // Shared across requests for same tenant
}
```

### 🔐 Scenario: Cache Service

```typescript
provideSingleton(ICache)
export class RedisCache {
  // One instance shared across entire application
  // Perfect for connection pools and caches
}
```

### 🚀 Scenario: Request-Scoped Service

```typescript
provide(IUserService)
export class UserService {
  // One instance per HTTP request
  // Stateless and scalable
}
```

### 🏗️ Scenario: External Provider

```typescript
@Provider({
  scope: "Singleton",
  name: "Stripe Payment Provider",
  version: "2.0.0",
  author: "Stripe Inc.",
  description: "Stripe payment integration",
  repo: "https://github.com/stripe/stripe-node"
})
export class StripeProvider implements IPaymentProvider {
  // Rich metadata for discovery and introspection
}
```

---

## Common Patterns

### Pattern 1: Request-Scoped Service

```typescript
provide(IUserService)
export class UserService { }
```

### Pattern 2: Singleton Cache

```typescript
provideSingleton(ICache)
export class RedisCache { }
```

### Pattern 3: Tenant-Scoped Service

```typescript
provideInScope(ITenantConfig, "tenant")
export class TenantConfig { }
```

### Pattern 4: Provider with Metadata

```typescript
@Provider({
  scope: "Singleton",
  name: "Database Provider",
  version: "1.0.0",
  dependencies: ["ConfigProvider"]
})
export class DatabaseProvider { }
```

---

## Troubleshooting

### ❌ Service Not Found

**Issue**: Service not resolved from container

**Solutions**:

1. Ensure decorator is applied: `provide(IService)`
2. Check service is registered in container: `container.create([module])`
3. Verify identifier matches injection: `@inject(IService)`

### ❌ Wrong Scope Behavior

**Issue**: Service not sharing/isolating as expected

**Solutions**:

1. Check decorator matches expected scope
2. Verify scope context is set correctly (for custom scopes)
3. Use explicit scope decorators for clarity

### ❌ Custom Scope Error

**Error**: `Cannot use built-in scope name`

**Solution**: Use corresponding decorator instead:
- `"Singleton"` → `provideSingleton()`
- `"Request"` → `provide()`
- `"Transient"` → `provideTransient()`

---

## Best Practices

1. **Use Request Scope by Default**: Best for most services (stateless, scalable)
2. **Singleton for Stateless Services**: Use for caches, loggers, configs
3. **Transient Sparingly**: Only when you need fresh instances every time
4. **Custom Scopes for Multi-Tenancy**: Use for tenant/transaction-scoped services
5. **Rich Metadata for Plugins**: Use `@Provider()` for external providers

---

## Related Documentation

- [AppContainer](../application/.docs/app-container-public-api.md) - Using services with container
- [Container Module](../container-module/.docs/container-module-public-api.md) - Module creation
- [Architecture Guide](./architecture.md) - Internal implementation details

