# Lifecycle Hooks Architecture

Internal architecture and design decisions for the ExpressoTS lifecycle hooks system.

## Table of Contents

- [Overview](#overview)
- [Architecture Components](#architecture-components)
- [Auto-Discovery Mechanism](#auto-discovery-mechanism)
- [Hook Execution Pipeline](#hook-execution-pipeline)
- [Integration with Bootstrap](#integration-with-bootstrap)
- [Design Decisions](#design-decisions)
- [Extension Points](#extension-points)

## Overview

The lifecycle hooks system provides:

1. **IBootstrap**: Initialize services after server is ready
2. **IShutdown**: Clean up resources during shutdown
3. **LifecycleRegistry**: Auto-discovery and execution of hooks
4. **Parallel Execution**: Hooks execute in parallel for performance

## Architecture Components

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  IBootstrap  │  │   IShutdown   │  │   Providers   │     │
│  │  Providers   │  │   Providers   │  │  (Decorated)  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              LifecycleRegistry                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Discovery Engine                                     │  │
│  │  - Scan @provide() metadata                           │  │
│  │  - Check prototype for bootstrap/shutdown              │  │
│  │  - Store in Sets                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Bootstrap Executor                                   │  │
│  │  - Get instances from container                       │  │
│  │  - Execute in parallel                               │  │
│  │  - Fail-fast on errors                               │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Shutdown Executor                                    │  │
│  │  - Get instances from container                       │  │
│  │  - Execute in parallel                               │  │
│  │  - Error-tolerant                                    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  DI Container (InversifyJS)                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Provider Instances                                    │  │
│  │  - Singleton scope required                           │  │
│  │  - Injected dependencies                              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Auto-Discovery Mechanism

### Discovery Process

The registry discovers providers by scanning `@provide()` decorator metadata:

```typescript
// 1. Get all @provide() metadata
const provideMetadata = Reflect.getMetadata(
  METADATA_KEY.provide,
  Reflect
) || [];

// 2. Check each provider
for (const metadata of provideMetadata) {
  const target = metadata.implementationType;
  
  // 3. Check prototype for lifecycle methods
  if (typeof target.prototype.bootstrap === "function") {
    this.bootstrapProviders.add(target);
  }
  
  if (typeof target.prototype.shutdown === "function") {
    this.shutdownProviders.add(target);
  }
}
```

### Metadata Storage

Providers are stored in Sets for O(1) lookup:

```typescript
private bootstrapProviders: Set<interfaces.Newable<IBootstrap>> = new Set();
private shutdownProviders: Set<interfaces.Newable<IShutdown>> = new Set();
```

### Type Guards

Type guards ensure type safety:

```typescript
function isBootstrap(obj: unknown): obj is IBootstrap {
  return (
    obj !== null &&
    typeof obj === "object" &&
    "bootstrap" in obj &&
    typeof (obj as IBootstrap).bootstrap === "function"
  );
}
```

## Hook Execution Pipeline

### Bootstrap Execution Flow

```
LifecycleRegistry.executeBootstrap()
    │
    ├─► Check if providers exist
    │   └─► Return early if none
    │
    ├─► For each bootstrap provider:
    │   ├─► Get instance from container
    │   ├─► Validate with isBootstrap()
    │   ├─► Call bootstrap() method
    │   └─► Collect promise (if async)
    │
    └─► Promise.all(promises)
        ├─► Wait for all hooks
        └─► Throw if any fails (fail-fast)
```

### Shutdown Execution Flow

```
LifecycleRegistry.executeShutdown(signal)
    │
    ├─► Check if providers exist
    │   └─► Return early if none
    │
    ├─► For each shutdown provider:
    │   ├─► Get instance from container
    │   ├─► Validate with isShutdown()
    │   ├─► Call shutdown(signal) method
    │   └─► Collect promise (if async)
    │
    └─► Promise.all(promises)
        ├─► Wait for all hooks
        └─► Log errors but don't throw (error-tolerant)
```

### Execution Code

**Bootstrap Execution**
```typescript
public async executeBootstrap(): Promise<void> {
  const promises: Array<Promise<void>> = [];

  for (const Provider of this.bootstrapProviders) {
    const instance = this.container.get<IBootstrap>(Provider);
    
    if (isBootstrap(instance)) {
      const result = instance.bootstrap();
      
      if (result instanceof Promise) {
        promises.push(
          result.catch((error) => {
            this.logger.error(`Bootstrap failed: ${error.message}`);
            throw error; // Fail-fast
          })
        );
      }
    }
  }

  await Promise.all(promises);
}
```

**Shutdown Execution**
```typescript
public async executeShutdown(signal?: NodeJS.Signals): Promise<void> {
  const promises: Array<Promise<void>> = [];

  for (const Provider of this.shutdownProviders) {
    const instance = this.container.get<IShutdown>(Provider);
    
    if (isShutdown(instance)) {
      const result = instance.shutdown(signal);
      
      if (result instanceof Promise) {
        promises.push(
          result.catch((error) => {
            // Log but don't throw - error-tolerant
            this.logger.error(`Shutdown failed: ${error.message}`);
          })
        );
      }
    }
  }

  await Promise.all(promises);
}
```

## Integration with Bootstrap

### Bootstrap Integration

The lifecycle registry is integrated into the application bootstrap process:

```typescript
// In bootstrap.ts
const container = AppFactory.create(App);
const registry = new LifecycleRegistry(container);

// Discover lifecycle hooks
registry.discover();

// After server is ready
await postServerInitialization();

// Execute bootstrap hooks
await registry.executeBootstrap();

// Server ready to accept requests
```

### Shutdown Integration

Shutdown hooks are called during graceful shutdown:

```typescript
// In server shutdown handler
async function gracefulShutdown(signal: NodeJS.Signals) {
  const registry = container.get(LifecycleRegistry);
  
  // Execute shutdown hooks
  await registry.executeShutdown(signal);
  
  // Close server
  server.close();
}
```

## Design Decisions

### ADR-001: Auto-Discovery vs Manual Registration

**Decision:** Use auto-discovery instead of manual registration.

**Rationale:**
- Reduces boilerplate
- No need to manually register hooks
- Consistent with other auto-discovery patterns (filters, guards)
- Less error-prone

**Alternatives Considered:**
- Manual registration (too verbose)
- Decorator-based registration (redundant with interface)

### ADR-002: Parallel Execution

**Decision:** Execute lifecycle hooks in parallel.

**Rationale:**
- Faster startup/shutdown
- Independent services don't block each other
- Better resource utilization

**Trade-offs:**
- No guaranteed execution order
- Services must be independent

### ADR-003: Singleton Scope Requirement

**Decision:** Require singleton scope for lifecycle hooks.

**Rationale:**
- Ensures same instance receives lifecycle hooks
- Prevents creating new instances just for hooks
- Consistent with application lifecycle

**Example:**
```typescript
// ✅ Correct
@provideSingleton(MyService)
export class MyService implements IBootstrap {}

// ❌ Wrong - creates new instance for hook
@provideTransient(MyService)
export class MyService implements IBootstrap {}
```

### ADR-004: Bootstrap Fail-Fast

**Decision:** Bootstrap hooks fail-fast (throw on error).

**Rationale:**
- Critical initialization failures should prevent server startup
- Better to fail early than start in broken state
- Easier to debug

**Implementation:**
```typescript
promises.push(
  result.catch((error) => {
    this.logger.error(`Bootstrap failed: ${error.message}`);
    throw error; // Fail-fast
  })
);
```

### ADR-005: Shutdown Error Tolerance

**Decision:** Shutdown hooks are error-tolerant (log but don't throw).

**Rationale:**
- All cleanup operations should have a chance to run
- One failing cleanup shouldn't prevent others
- Better to attempt all cleanup than fail early

**Implementation:**
```typescript
promises.push(
  result.catch((error) => {
    // Log but don't throw - error-tolerant
    this.logger.error(`Shutdown failed: ${error.message}`);
  })
);
```

### ADR-006: Interface-Based Discovery

**Decision:** Use TypeScript interfaces for lifecycle hooks.

**Rationale:**
- Type-safe
- Clear contract
- IDE autocomplete support
- Compile-time checking

**Alternatives Considered:**
- Decorator-based (`@Bootstrap()`, `@Shutdown()`)
- Method naming convention (`onBootstrap()`, `onShutdown()`)

## Extension Points

### Custom Lifecycle Hooks

Create custom lifecycle interfaces:

```typescript
export interface IPreBootstrap {
  preBootstrap(): void | Promise<void>;
}

// Extend registry to support custom hooks
class ExtendedLifecycleRegistry extends LifecycleRegistry {
  private preBootstrapProviders: Set<interfaces.Newable<IPreBootstrap>> = new Set();
  
  discover(): void {
    super.discover();
    // Discover custom hooks
  }
}
```

### Hook Ordering

Add execution order support:

```typescript
interface IBootstrap {
  bootstrap(): void | Promise<void>;
  bootstrapOrder?: number; // Lower = earlier
}

// Sort by order before execution
const sorted = Array.from(this.bootstrapProviders).sort(
  (a, b) => a.prototype.bootstrapOrder - b.prototype.bootstrapOrder
);
```

### Hook Dependencies

Support hook dependencies:

```typescript
interface IBootstrap {
  bootstrap(): void | Promise<void>;
  dependsOn?: Array<interfaces.Newable<IBootstrap>>;
}

// Build dependency graph and execute in order
```

## Performance Considerations

### Discovery Performance

- **Time Complexity**: O(n) where n = number of providers
- **Space Complexity**: O(n) for Sets
- **Caching**: Discovery is cached (idempotent)

### Execution Performance

- **Time Complexity**: O(n) where n = number of hooks
- **Parallel Execution**: All hooks run concurrently
- **Bottleneck**: Slowest hook determines total time

### Memory Usage

- **Sets**: Store provider constructors (minimal memory)
- **Instances**: Retrieved from DI container (shared instances)
- **Promises**: Collected during execution (short-lived)

## Related Code

- [LifecycleRegistry](../lifecycle-registry.ts) - Registry implementation
- [Lifecycle Interfaces](../lifecycle.interface.ts) - Interface definitions
- [Bootstrap](../application/bootstrap.ts) - Bootstrap integration
- [DI Container](../di/) - Dependency injection

