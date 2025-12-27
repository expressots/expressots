# AppContainer - Public API

> 🎯 **Goal**: Dependency injection container for ExpressoTS applications

## Quick Start

```typescript
import { AppContainer } from '@expressots/core';
import { ContainerModule } from 'inversify';

// Create container
const container = new AppContainer();

// Create and load modules
container.create([
  new AppModule(),
  new UserModule()
]);
```

---

## Progressive Enhancement

### Level 1: Basic Usage

```typescript
const container = new AppContainer();
container.create([new MyModule()]);
```

### Level 2: Custom Scope

```typescript
import { BindingScopeEnum } from 'inversify';

const container = new AppContainer({
  defaultScope: BindingScopeEnum.Singleton
});
container.create([new MyModule()]);
```

### Level 3: Advanced Configuration

```typescript
const container = new AppContainer({
  defaultScope: BindingScopeEnum.Singleton,
  skipBaseClassChecks: true,
  autoBindInjectable: true
});
container.create([new MyModule()]);
```

---

## API Reference

### `AppContainer`

Dependency injection container wrapper.

#### Constructor

```typescript
new AppContainer(options?: ContainerOptions)
```

**Parameters:**

- `options` - Optional container configuration

**Default Options:**

```typescript
{
  defaultScope: BindingScopeEnum.Request,  // One instance per HTTP request
  autoBindInjectable: true                  // Auto-bind @injectable() classes
}
```

#### Methods

##### `create(modules: ContainerModule[]): void`

Creates and configures the dependency injection container.

**Parameters:**

- `modules` - Array of ContainerModule instances to load

**What Happens:**

1. Creates InversifyJS container with configured options
2. Binds container to itself (for injection)
3. Loads built-in provider module
4. Loads your custom modules

**Example:**

```typescript
container.create([
  new AppModule(),
  new UserModule(),
  new ProductModule()
]);
```

##### `viewContainerBindings(): void`

Displays all container bindings in a formatted table.

**Useful for:**

- Debugging dependency injection issues
- Understanding what's registered
- Verifying binding scopes

**Example:**

```typescript
container.create([new MyModule()]);
container.viewContainerBindings();

// Output:
// ┌─────────────────────────┬──────────────┬──────────────┬────────┐
// │ Service Identifier      │ Scope        │ Type         │ Cache  │
// ├─────────────────────────┼──────────────┼──────────────┼────────┤
// │ IUserService            │ Request      │ Constructor  │ No     │
// │ IProductService         │ Singleton    │ Constructor  │ Yes    │
// └─────────────────────────┴──────────────┴──────────────┴────────┘
```

##### `getContainerOptions(): ContainerOptions`

Retrieves the container configuration options.

**Returns:** Container options, or `undefined` if container not created yet

**Example:**

```typescript
const container = new AppContainer({
  defaultScope: BindingScopeEnum.Singleton
});
container.create([new MyModule()]);

const options = container.getContainerOptions();
console.log(options.defaultScope);  // BindingScopeEnum.Singleton
```

##### `get Container(): Container`

Retrieves the underlying InversifyJS container instance.

**Use Cases:**

- Accessing InversifyJS-specific APIs
- Advanced container manipulation
- Integration with InversifyJS plugins

**Example:**

```typescript
const container = new AppContainer();
container.create([new MyModule()]);

const inversifyContainer = container.Container;
// Use InversifyJS APIs directly
```

---

## Binding Scopes

### Request Scope (Default)

```typescript
const container = new AppContainer({
  defaultScope: BindingScopeEnum.Request
});
```

**Behavior:**
- One instance per HTTP request
- Stateless and scalable
- Recommended for most services

### Singleton Scope

```typescript
const container = new AppContainer({
  defaultScope: BindingScopeEnum.Singleton
});
```

**Behavior:**
- One instance for application lifetime
- Shared state across requests
- Use for stateless services or caches

### Transient Scope

```typescript
const container = new AppContainer({
  defaultScope: BindingScopeEnum.Transient
});
```

**Behavior:**
- New instance every time
- No caching
- Use sparingly (performance impact)

---

## Real-World Scenarios

### Scenario 1: Basic Application

```typescript
import { AppContainer } from '@expressots/core';
import { AppModule } from './app.module';

const container = new AppContainer();
container.create([new AppModule()]);
```

### Scenario 2: Microservice with Singleton Services

```typescript
const container = new AppContainer({
  defaultScope: BindingScopeEnum.Singleton  // Shared services
});
container.create([
  new DatabaseModule(),
  new CacheModule(),
  new ApiModule()
]);
```

### Scenario 3: Debugging Container Issues

```typescript
const container = new AppContainer();
container.create([new MyModule()]);

// View all bindings
container.viewContainerBindings();

// Check options
const options = container.getContainerOptions();
console.log('Default scope:', options.defaultScope);
```

### Scenario 4: Custom InversifyJS Integration

```typescript
const container = new AppContainer();
container.create([new MyModule()]);

// Access underlying container
const inversifyContainer = container.Container;

// Use InversifyJS plugins
import { getContainer } from 'inversify-devtools';
getContainer(inversifyContainer);
```

---

## Common Patterns

### Pattern 1: Default Configuration

```typescript
const container = new AppContainer();
container.create([new MyModule()]);
```

### Pattern 2: Singleton Services

```typescript
const container = new AppContainer({
  defaultScope: BindingScopeEnum.Singleton
});
container.create([new MyModule()]);
```

### Pattern 3: Multiple Modules

```typescript
const container = new AppContainer();
container.create([
  new CoreModule(),
  new FeatureModule(),
  new IntegrationModule()
]);
```

---

## Troubleshooting

### ❌ Container Not Created Yet

**Error**: `Container not created yet`

**Solution**: Call `create()` before accessing container methods

```typescript
const container = new AppContainer();
container.create([new MyModule()]);  // Must call this first
container.viewContainerBindings();    // Now this works
```

### ❌ Service Not Found

**Error**: `No matching bindings found`

**Solutions**:

1. Check module is loaded:
```typescript
container.create([new MyModule()]);  // Ensure module is included
```

2. Verify binding exists in module:
```typescript
// In MyModule
bind<IUserService>(TYPES.UserService).to(UserService);
```

3. Check service identifier matches:
```typescript
// Use same identifier for binding and injection
@inject(TYPES.UserService) private userService: IUserService
```

### ❌ Wrong Scope Behavior

**Issue**: Service instance not shared/isolated as expected

**Solution**: Check default scope and individual bindings

```typescript
// Check default scope
const options = container.getContainerOptions();
console.log('Default scope:', options.defaultScope);

// View all bindings to see individual scopes
container.viewContainerBindings();
```

---

## Best Practices

1. **Use Request Scope**: Default request scope is best for most services
2. **Singleton for Stateless**: Use singleton for stateless services or caches
3. **Debug with viewContainerBindings()**: Use to understand container state
4. **Load Modules in Order**: Dependencies should be loaded before dependents
5. **One Container Per App**: Create one container per application instance

---

## Related Documentation

- [Architecture Guide](./architecture.md) - Internal implementation details
- [Decision Log](./decision-log.md) - Design decisions
- [Examples](./examples/) - Code examples

