# Dependency Injection - Public API

> 🎯 **Goal**: Use InversifyJS for dependency injection in ExpressoTS

## Overview

ExpressoTS uses [InversifyJS](https://github.com/inversify/InversifyJS) for dependency injection. Most InversifyJS APIs are available from `@expressots/core`.

**Note**: For complete InversifyJS documentation, see: https://github.com/inversify/InversifyJS

---

## Quick Start

```typescript
import { injectable, inject, Container } from "@expressots/core";

// Define service interface
interface IUserService {
  getUsers(): string[];
}

// Implement service
@injectable()
export class UserService implements IUserService {
  constructor(@inject("IUserRepository") private repo: IUserRepository) {}
  
  getUsers(): string[] {
    return this.repo.findAll();
  }
}

// Register in container
const container = new Container();
container.bind<IUserService>("IUserService").to(UserService);
```

---

## Core InversifyJS APIs

### Decorators

- `@injectable()` - Mark class as injectable
- `@inject(identifier)` - Inject dependency
- `@optional()` - Optional dependency
- `@multiInject(identifier)` - Inject multiple bindings
- `@named(name)` - Named binding
- `@tagged(tag, value)` - Tagged binding
- `@postConstruct()` - Lifecycle hook
- `@preDestroy()` - Lifecycle hook

### Container

- `Container` - Dependency injection container
- `ContainerModule` - Module for organizing bindings
- `AsyncContainerModule` - Async module loading

### Scopes

- `Scope.Singleton` - One instance for app lifetime
- `Scope.Transient` - New instance every time
- `Scope.Request` - One instance per HTTP request

---

## ExpressoTS Extensions

### `fluentProvide(identifier)`

Fluent API for provider registration (used internally).

**Example:**

```typescript
import { fluentProvide } from "@expressots/core";

fluentProvide(IService)
  .inSingletonScope()
  .done()(MyService);
```

### `buildProviderModule()`

Builds ContainerModule from all `@provide()` decorated classes (used internally).

### `ScopeRegistry`

Manages custom scope stores for multi-tenant applications.

**Example:**

```typescript
import { ScopeRegistry } from "@expressots/core";

const registry = new ScopeRegistry();
const tenantScope = registry.getScopeStore("tenant");
```

---

## Common Patterns

### Pattern 1: Basic Injection

```typescript
@injectable()
export class MyService {
  constructor(@inject("IDependency") private dep: IDependency) {}
}
```

### Pattern 2: Optional Dependency

```typescript
@injectable()
export class MyService {
  constructor(@optional() @inject("IOptional") private opt?: IOptional) {}
}
```

### Pattern 3: Multiple Bindings

```typescript
@injectable()
export class MyService {
  constructor(@multiInject("IPlugin") private plugins: IPlugin[]) {}
}
```

### Pattern 4: Named Bindings

```typescript
container.bind<IService>("IService").to(Service).whenTargetNamed("primary");
container.bind<IService>("IService").to(Service).whenTargetNamed("secondary");

@injectable()
export class MyService {
  constructor(
    @inject("IService") @named("primary") private primary: IService,
    @inject("IService") @named("secondary") private secondary: IService
  ) {}
}
```

---

## Binding Scopes

### Singleton

```typescript
container.bind<IService>("IService")
  .to(Service)
  .inSingletonScope();
```

### Transient

```typescript
container.bind<IService>("IService")
  .to(Service)
  .inTransientScope();
```

### Request

```typescript
container.bind<IService>("IService")
  .to(Service)
  .inRequestScope();
```

### Custom Scope

```typescript
container.bind<IService>("IService")
  .to(Service)
  .inScope("tenant");
```

---

## Lifecycle Hooks

### Post Construct

```typescript
@injectable()
export class MyService {
  @postConstruct()
  initialize() {
    // Called after constructor and all injections
  }
}
```

### Pre Destroy

```typescript
@injectable()
export class MyService {
  @preDestroy()
  cleanup() {
    // Called before instance is destroyed
  }
}
```

---

## Related Documentation

- [InversifyJS Documentation](https://github.com/inversify/InversifyJS) - Complete InversifyJS guide
- [AppContainer](../application/.docs/app-container-public-api.md) - Using container in ExpressoTS
- [Scope Binding Decorators](../decorator/.docs/decorator-public-api.md) - ExpressoTS decorators

