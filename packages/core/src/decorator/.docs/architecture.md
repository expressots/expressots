# Scope Binding Decorators - Architecture

> 🎯 **Audience**: Framework developers and contributors

This document explains the internal architecture of the scope binding decorator system.

---

## Overview

The scope binding decorators provide a declarative way to register services with dependency injection, supporting multiple scopes and rich metadata.

---

## Architecture Diagram

```mermaid
graph TD
    A[@provide/Provider Decorator] --> B[Store Metadata]
    B --> C[Apply Binding]
    C --> D{Scope Type?}
    D -->|Singleton| E[inSingletonScope]
    D -->|Transient| F[inTransientScope]
    D -->|Request| G[inRequestScope]
    D -->|Custom| H[inScope custom]
    E --> I[Container Registration]
    F --> I
    G --> I
    H --> I
```

---

## Core Components

### 1. provide()

**Location**: `scope-binding.ts:65`

**Responsibilities**:
- Request-scoped binding
- Metadata storage
- Decorator application

**Key Design**:
- Uses `fluentProvide()` internally
- Default scope: Request
- Stores metadata for introspection

### 2. provideSingleton()

**Location**: `scope-binding.ts:89`

**Responsibilities**:
- Singleton-scoped binding
- Provider source tracking

**Key Design**:
- Uses `fluentProvide().inSingletonScope()`
- Supports source parameter
- Stores "Singleton" in metadata

### 3. provideTransient()

**Location**: `scope-binding.ts:116`

**Responsibilities**:
- Transient-scoped binding
- No caching

**Key Design**:
- Uses `fluentProvide().inTransientScope()`
- Creates new instance every time
- Stores "Transient" in metadata

### 4. provideInScope()

**Location**: `scope-binding.ts:152`

**Responsibilities**:
- Custom-scoped binding
- Scope validation

**Key Design**:
- Validates scope name (cannot be built-in)
- Uses `fluentProvide().inScope(scopeName)`
- Stores custom scope name in metadata

### 5. @Provider()

**Location**: `scope-binding.ts:208`

**Responsibilities**:
- Rich metadata support
- Scope-based binding application
- Provider discovery

**Key Design**:
- Stores all metadata in Reflect
- Applies binding based on scope option
- Supports discovery and introspection

---

## Metadata Storage

Metadata is stored using Reflect:

```typescript
Reflect.defineMetadata(METADATA_KEY.scope, scope, target);
Reflect.defineMetadata(METADATA_KEY.source, source, target);
Reflect.defineMetadata(METADATA_KEY.providerMeta, options, target);
```

**Keys:**
- `scope` - Binding scope
- `source` - Provider source type
- `providerMeta` - Full provider options

---

## Scope Resolution

Scopes are resolved in this order:

1. **Explicit parameter** (for `provideInScope()`)
2. **Options.scope** (for `@Provider()`)
3. **Default** (Request scope for `provide()`)

---

## Provider Source Types

- `"user"` - User-defined provider
- `"external"` - Third-party plugin/package
- `"builtin"` - Framework built-in provider

Used for:
- Provider discovery
- Health checks
- Metrics collection

---

## Extension Points

### Custom Scopes

```typescript
provideInScope(IService, "custom-scope")
export class MyService { }
```

### Rich Metadata

```typescript
@Provider({
  name: "My Provider",
  version: "1.0.0",
  dependencies: ["OtherProvider"]
})
export class MyProvider { }
```

---

## Related Code

- **fluentProvide**: `../di/binding-decorator`
- **ProviderRegistry**: `../provider/provider-registry`
- **METADATA_KEY**: `../di/binding-decorator/constants`

---

## See Also

- [Public API](./decorator-public-api.md) - User-facing documentation

