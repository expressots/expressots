# Container Module - Public API

> 🎯 **Goal**: Create and compose dependency injection modules easily

## Quick Start

```typescript
import { CreateModule, combineModules } from "@expressots/core";
import { UserController } from "./user.controller";
import { AuthController } from "./auth.controller";

// Create a module from controllers
const module = CreateModule([UserController, AuthController]);

// Use in your app container
container.create([module]);
```

---

## Progressive Enhancement

### Level 1: Simple Module

```typescript
const module = CreateModule([UserController, AuthController]);
```

### Level 2: With Scope

```typescript
import { Scope } from "@expressots/core";

const module = CreateModule([UserController], Scope.Singleton);
```

### Level 3: With Custom Bindings

```typescript
const module = CreateModule([UserController], (bind) => {
  bind<ILogger>("ILogger").to(ConsoleLogger).inSingletonScope();
  bind<ICache>("ICache").to(RedisCache);
});
```

### Level 4: Combined Modules

```typescript
const controllerModule = CreateModule([UserController, AuthController]);
const serviceModule = createModule((bind) => {
  bind<ILogger>("ILogger").to(ConsoleLogger);
});

const appModule = combineModules(controllerModule, serviceModule);
```

---

## API Reference

### `CreateModule(controllers, scopeOrBindings?, customBindings?)`

Create a ContainerModule from controllers.

**Parameters:**

- `controllers` - Array of controller classes
- `scopeOrBindings` - Optional binding scope or custom bindings callback
- `customBindings` - Optional callback for additional bindings (only if scopeOrBindings is a scope)

**Returns:** `ContainerModule`

**Examples:**

```typescript
// Simple
const module = CreateModule([UserController]);

// With scope
const module = CreateModule([UserController], Scope.Singleton);

// With bindings callback
const module = CreateModule([UserController], (bind) => {
  bind<ILogger>("ILogger").to(ConsoleLogger);
});

// With scope AND bindings
const module = CreateModule(
  [UserController],
  Scope.Singleton,
  (bind) => {
    bind<ILogger>("ILogger").to(ConsoleLogger);
  }
);
```

### `createModule(callback)`

Create a ContainerModule from a bindings callback.

**Parameters:**

- `callback` - Callback with `bind` function (and optionally `unbind`, `isBound`, `rebind`)

**Returns:** `ContainerModule`

**Example:**

```typescript
const module = createModule((bind) => {
  bind<ILogger>("ILogger").to(ConsoleLogger).inSingletonScope();
  bind<ICache>("ICache").to(RedisCache);
});
```

### `combineModules(...modules)`

Combine multiple ContainerModules into a single module.

**Parameters:**

- `modules` - ContainerModules to combine

**Returns:** `ContainerModule`

**Example:**

```typescript
const controllerModule = CreateModule([UserController]);
const serviceModule = createModule((bind) => {
  bind<ILogger>("ILogger").to(ConsoleLogger);
});

const appModule = combineModules(controllerModule, serviceModule);
```

### `@scope(binding)`

Decorator to set binding scope for a class.

**Parameters:**

- `binding` - Binding scope (Singleton, Transient, Request, or custom string)

**Example:**

```typescript
@scope(Scope.Singleton)
export class CacheService { }
```

---

## Real-World Scenarios

### 🏢 Scenario: Feature Modules

```typescript
// User feature module
const userModule = CreateModule([UserController], (bind) => {
  bind<IUserService>("IUserService").to(UserService);
  bind<IUserRepository>("IUserRepository").to(UserRepository);
});

// Auth feature module
const authModule = CreateModule([AuthController], (bind) => {
  bind<IAuthService>("IAuthService").to(AuthService);
});

// Combine into app module
const appModule = combineModules(userModule, authModule);
```

### 🔐 Scenario: Custom Scope

```typescript
// Tenant-scoped service
const tenantModule = createModule((bind) => {
  bind<IPermissionService>("IPermissionService")
    .to(PermissionService)
    .inScope("tenant");
});
```

### 🚀 Scenario: Module Composition

```typescript
// Core module
const coreModule = createModule((bind) => {
  bind<ILogger>("ILogger").to(ConsoleLogger).inSingletonScope();
  bind<ICache>("ICache").to(RedisCache).inSingletonScope();
});

// Feature modules
const userModule = CreateModule([UserController]);
const productModule = CreateModule([ProductController]);

// Combine all
const appModule = combineModules(coreModule, userModule, productModule);
```

---

## Common Patterns

### Pattern 1: Simple Controller Module

```typescript
const module = CreateModule([UserController, AuthController]);
```

### Pattern 2: Module with Services

```typescript
const module = CreateModule([UserController], (bind) => {
  bind<IUserService>("IUserService").to(UserService);
});
```

### Pattern 3: Singleton Controllers

```typescript
const module = CreateModule(
  [UserController],
  Scope.Singleton
);
```

### Pattern 4: Module Composition

```typescript
const featureModules = [
  CreateModule([UserController]),
  CreateModule([ProductController]),
  CreateModule([OrderController])
];

const appModule = combineModules(...featureModules);
```

---

## Binding Scopes

### Request Scope (Default)

```typescript
const module = CreateModule([UserController]);
// Controllers are request-scoped by default
```

### Singleton Scope

```typescript
const module = CreateModule([UserController], Scope.Singleton);
```

### Transient Scope

```typescript
const module = CreateModule([UserController], Scope.Transient);
```

### Custom Scope

```typescript
const module = createModule((bind) => {
  bind<IService>("IService").to(Service).inScope("tenant");
});
```

---

## Troubleshooting

### ❌ Controllers Not Registered

**Issue**: Controllers not found in container

**Solutions**:

1. Ensure module is loaded: `container.create([module])`
2. Check controller classes are exported correctly
3. Verify `@controller()` decorator is applied

### ❌ Wrong Scope Behavior

**Issue**: Services not sharing/isolating as expected

**Solutions**:

1. Check scope parameter matches expected behavior
2. Verify `@scope()` decorator if using metadata
3. Use explicit scope parameter for clarity

---

## Best Practices

1. **Use CreateModule for Controllers**: Simplest way to register controllers
2. **Use createModule for Services**: Clean API for service bindings
3. **Combine Related Modules**: Use `combineModules()` for feature modules
4. **Explicit Scopes**: Specify scope explicitly when needed
5. **Separate Concerns**: Create separate modules for different features

---

## Related Documentation

- [AppContainer](../application/.docs/app-container-public-api.md) - Using modules with container
- [Architecture Guide](./architecture.md) - Internal implementation details

