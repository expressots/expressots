# Lazy Loading Public API

> **Complete user-facing documentation for ExpressoTS lazy loading system**

## Quick Start

Create lazy modules for on-demand loading:

```typescript
import { CreateLazyModule } from "@expressots/core";

// Create lazy module
const AdminModule = CreateLazyModule(
  [AdminController, AdminDashboardController],
  { name: "AdminModule" }
).withPreloadHint("low");

// Module won't load until first access to /admin/* routes
```

## Core Concepts

### Lazy Loading

Lazy loading improves startup time by loading modules only when needed:
- **Faster Startup**: Only load essential modules at startup
- **On-Demand**: Load modules when routes are accessed
- **Progressive**: Load modules in phases
- **Analytics**: Track module usage patterns

### Module Status

Modules have different load statuses:
- `pending` - Not yet loaded
- `loading` - Currently loading
- `loaded` - Successfully loaded
- `failed` - Failed to load
- `warming` - Being warmed up in background

## Creating Lazy Modules

### Basic Lazy Module

```typescript
import { CreateLazyModule } from "@expressots/core";

const AdminModule = CreateLazyModule(
  [AdminController, AdminDashboardController]
);
```

### Named Module

```typescript
const AdminModule = CreateLazyModule(
  [AdminController, AdminDashboardController],
  { name: "AdminModule" }
);
```

### Module with Configuration

```typescript
const AdminModule = CreateLazyModule(
  [AdminController, AdminDashboardController],
  {
    name: "AdminModule",
    preloadHint: "low",
    timeout: 30000,
    dependencies: ["AuthModule"]
  }
);
```

## Preload Hints

Control when modules should be preloaded:

### High Priority

Preload during startup idle time:

```typescript
const CriticalModule = CreateLazyModule([CriticalController])
  .withPreloadHint("high");
```

### Medium Priority

Preload after critical modules:

```typescript
const ImportantModule = CreateLazyModule([ImportantController])
  .withPreloadHint("medium");
```

### Low Priority

Only load when accessed:

```typescript
const OptionalModule = CreateLazyModule([OptionalController])
  .withPreloadHint("low");
```

### Never Preload

Never preload, always load on-demand:

```typescript
const RareModule = CreateLazyModule([RareController])
  .withPreloadHint("never");
```

## Module Status Tracking

### Check Status

```typescript
const status = AdminModule.status;
// "pending" | "loading" | "loaded" | "failed" | "warming"

const isLoaded = AdminModule.isLoaded; // boolean
const loadTime = AdminModule.loadTime; // number | null
const error = AdminModule.error; // Error | null
```

### Wait for Load

```typescript
// Wait for module to load
await AdminModule.load();

// Load with timeout
await AdminModule.load({ timeout: 5000 });
```

### Force Load

```typescript
// Force load even if already loaded
await AdminModule.load({ force: true });
```

## Usage Analytics

Track module usage patterns:

```typescript
import { LazyModuleManager } from "@expressots/core";

const manager = container.get(LazyModuleManager);

// Get usage metrics
const metrics = manager.getMetrics(AdminModule);
// {
//   loadCount: 10,
//   averageLoadTime: 45,
//   lastLoadTime: Date,
//   errorCount: 0
// }

// Get recommendations
const recommendations = manager.getRecommendations();
// [
//   {
//     module: AdminModule,
//     recommendation: "preload",
//     reason: "Frequently accessed"
//   }
// ]
```

## Prefetching

Prefetch modules based on routes:

```typescript
const AdminModule = CreateLazyModule([AdminController])
  .withPrefetchOn([
    { route: "/dashboard", reason: "User likely to access admin" }
  ]);
```

### Prefetch After Idle

Start loading after user is idle:

```typescript
const AdminModule = CreateLazyModule([AdminController])
  .withPrefetchAfterIdle(5000); // Start loading after 5s idle
```

## Module Dependencies

Define module dependencies:

```typescript
const AdminModule = CreateLazyModule([AdminController])
  .withDependencies(["AuthModule", "PermissionModule"]);

// Dependencies are loaded before this module
```

## Background Warmup

Warm up modules during idle time:

```typescript
import { LazyModuleWarmup } from "@expressots/core";

const warmup = container.get(LazyModuleWarmup);

// Warm up high-priority modules
await warmup.warmupHighPriority();

// Warm up specific module
await warmup.warmup(AdminModule);
```

## API Reference

### `CreateLazyModule(modules, config?)`

Factory function to create lazy module.

**Parameters:**
- `modules`: Array of modules to load lazily
- `config`: Optional configuration

**Returns:** `ILazyModule` - Lazy module instance

### `ILazyModule`

Interface for lazy modules.

**Properties:**
- `name: string` - Module name
- `status: ModuleLoadStatus` - Current load status
- `isLoaded: boolean` - Whether module is loaded
- `loadTime: number | null` - Load time in milliseconds
- `error: Error | null` - Load error if any

**Methods:**
- `load(options?): Promise<ContainerModule>` - Load module
- `unload(): Promise<void>` - Unload module
- `withPreloadHint(hint): ILazyModule` - Set preload hint
- `withPrefetchOn(routes): ILazyModule` - Set prefetch routes
- `withPrefetchAfterIdle(ms): ILazyModule` - Set idle prefetch
- `withDependencies(deps): ILazyModule` - Set dependencies

### `LazyModuleManager`

Manages lazy modules and provides analytics.

**Methods:**
- `register(module): void` - Register module
- `get(moduleName): ILazyModule` - Get module by name
- `getAll(): Array<ILazyModule>` - Get all modules
- `getMetrics(module): ModuleMetrics` - Get module metrics
- `getRecommendations(): Array<Recommendation>` - Get recommendations

### `LazyModuleWarmup`

Warms up modules in background.

**Methods:**
- `warmup(module): Promise<void>` - Warm up module
- `warmupHighPriority(): Promise<void>` - Warm up high-priority modules
- `warmupMediumPriority(): Promise<void>` - Warm up medium-priority modules

## Troubleshooting

### Module Not Loading

1. **Check status**: Verify module status with `module.status`
2. **Check errors**: Check `module.error` for load errors
3. **Check dependencies**: Ensure dependencies are loaded
4. **Check timeout**: Increase timeout if needed

### Slow Loading

1. **Check dependencies**: Reduce module dependencies
2. **Use preload hints**: Use high/medium preload hints
3. **Optimize modules**: Reduce module size
4. **Use warmup**: Warm up modules in background

### Module Loading Multiple Times

1. **Check force option**: Don't use `force: true` unnecessarily
2. **Check status**: Check `isLoaded` before loading
3. **Use load promise**: Use existing load promise if available

## Best Practices

1. **Use Preload Hints**: Set appropriate preload hints
2. **Track Usage**: Monitor module usage patterns
3. **Optimize Dependencies**: Minimize module dependencies
4. **Use Warmup**: Warm up frequently used modules
5. **Handle Errors**: Handle load errors gracefully
6. **Monitor Performance**: Track load times and optimize
7. **Document Modules**: Document module purpose and usage

---

**See Also:**
- [Architecture Guide](./architecture.md) - Internal implementation
- [Examples](./examples/) - Code examples
- [Container Module](../container-module/.docs/) - Container modules

