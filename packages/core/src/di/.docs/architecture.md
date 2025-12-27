# Dependency Injection - Architecture

> 🎯 **Audience**: Framework developers and contributors

This document explains how ExpressoTS integrates with InversifyJS and the ExpressoTS-specific extensions.

---

## Overview

ExpressoTS uses InversifyJS as its dependency injection container. The `di/` folder contains:

- **InversifyJS Core**: Full InversifyJS library (re-exported)
- **ExpressoTS Extensions**: Binding decorators and scope management

---

## Architecture

```
di/
├── inversify.ts (re-exports InversifyJS APIs)
├── binding-decorator/ (ExpressoTS extensions)
│   ├── fluentProvide() - Fluent binding API
│   ├── buildProviderModule() - Auto-discovery
│   └── provide() - Simple binding decorator
├── scope/ (Custom scope management)
│   └── scope-registry.ts - Scope store management
└── [InversifyJS internals] (container, planning, resolution, etc.)
```

---

## ExpressoTS Extensions

### 1. Binding Decorators

**Location**: `binding-decorator/`

**Purpose**: Simplify provider registration with decorators

**Key Components**:
- `fluentProvide()` - Fluent API for bindings
- `provide()` - Simple decorator
- `buildProviderModule()` - Auto-discovery module

**How It Works**:
1. Classes decorated with `@provide()` store metadata
2. `buildProviderModule()` reads metadata
3. Creates ContainerModule with all bindings
4. Loaded automatically by AppContainer

### 2. Scope Registry

**Location**: `scope/scope-registry.ts`

**Purpose**: Manage custom scope stores

**Key Features**:
- Per-scope instance storage
- Scope store lifecycle management
- Used by InversifyJS for custom scope resolution

---

## Integration with ExpressoTS

### Provider Auto-Discovery

```typescript
// 1. Decorate class
@provide(IService)
export class MyService { }

// 2. buildProviderModule() discovers it
const module = buildProviderModule();

// 3. AppContainer loads it automatically
container.load(buildProviderModule());
```

### Custom Scopes

```typescript
// 1. Register service with custom scope
provideInScope(IService, "tenant")
export class TenantService { }

// 2. ScopeRegistry manages instances
const registry = globalScopeRegistry;
const tenantStore = registry.getScopeStore("tenant");

// 3. Container resolves from scope store
const instance = container.get<IService>("IService");
```

---

## Related Code

- **InversifyJS**: Full library in `di/` folder
- **AppContainer**: `../application/application-container.ts`
- **Scope Decorators**: `../decorator/scope-binding.ts`

---

## See Also

- [Public API](./di-public-api.md) - User-facing documentation
- [InversifyJS Docs](https://github.com/inversify/InversifyJS) - Complete InversifyJS guide

