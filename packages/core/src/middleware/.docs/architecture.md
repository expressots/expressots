# Middleware Architecture

Internal architecture and design decisions for the ExpressoTS middleware system.

## Table of Contents

- [Overview](#overview)
- [Architecture Components](#architecture-components)
- [Middleware Pipeline](#middleware-pipeline)
- [Middleware Resolver](#middleware-resolver)
- [Middleware Presets](#middleware-presets)
- [Performance Profiling](#performance-profiling)
- [Design Decisions](#design-decisions)

## Overview

The middleware system provides:

1. **Middleware Service**: Centralized middleware management
2. **Built-in Helpers**: Pre-configured middleware methods
3. **Auto-Discovery**: Automatic middleware package resolution
4. **Presets**: Pre-configured middleware bundles
5. **Profiling**: Performance tracking and metrics

## Architecture Components

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Built-in   │  │    Custom    │  │   Presets    │     │
│  │  Middleware  │  │  Middleware  │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Middleware Service                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Pipeline Manager                                     │  │
│  │  - Ordered array (insertion order)                 │  │
│  │  - Map for O(1) lookup                              │  │
│  │  - Cached sorted pipeline                           │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Middleware Resolver                                 │  │
│  │  - Package discovery                                │  │
│  │  - Module caching                                   │  │
│  │  - Factory invocation                              │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Preset Manager                                     │  │
│  │  - Preset registry                                 │  │
│  │  - Override handling                               │  │
│  │  - Skip logic                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Profiler Integration                               │  │
│  │  - Performance tracking                             │  │
│  │  - Metrics collection                              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Middleware Pipeline

### Pipeline Structure

The middleware pipeline maintains:

1. **Ordered Array**: Preserves insertion order
2. **Map Lookup**: O(1) middleware lookup by name
3. **Cached Sorting**: Sorted pipeline cached until invalidated

```typescript
private middlewarePipeline: Array<MiddlewarePipeline> = [];
private middlewareMap = new Map<string, MiddlewarePipeline>();
private sortedPipelineCache: Array<MiddlewarePipeline> | null = null;
```

### Pipeline Entry

Each middleware entry contains:

```typescript
interface MiddlewarePipeline {
  order: number;              // Insertion order
  middleware: ExpressHandler; // The middleware handler
  name?: string;              // Middleware name
  category?: MiddlewareCategory; // Category
  isBuiltIn?: boolean;        // Built-in flag
  condition?: (req: Request) => boolean; // Conditional execution
}
```

### Adding Middleware

**Built-in Middleware:**
```typescript
private addBuiltInMiddleware(
  name: string,
  category: MiddlewareCategory,
  middlewareFactory: () => ExpressHandler | null
): boolean {
  // Check if exists
  if (this.middlewareExists(name)) {
    return false;
  }

  // Create middleware
  const middleware = middlewareFactory();
  if (!middleware) {
    return false;
  }

  // Add to pipeline
  const entry: MiddlewarePipeline = {
    order: this.insertionOrder++,
    middleware,
    name,
    category,
    isBuiltIn: true
  };

  this.middlewarePipeline.push(entry);
  this.middlewareMap.set(name, entry);
  this.invalidateCache();

  return true;
}
```

**Custom Middleware:**
```typescript
addMiddleware(options: MiddlewareOptions): void {
  const entry: MiddlewarePipeline = {
    order: this.insertionOrder++,
    middleware: options,
    name: this.getMiddlewareName(options),
    category: this.getMiddlewareCategory(name)
  };

  this.middlewarePipeline.push(entry);
  this.invalidateCache();
}
```

### Pipeline Execution

Middleware executes in insertion order:

```typescript
getMiddlewarePipeline(): Array<ExpressHandler> {
  // Use cached sorted pipeline if available
  if (this.sortedPipelineCache) {
    return this.sortedPipelineCache.map(m => m.middleware);
  }

  // Sort by insertion order
  const sorted = [...this.middlewarePipeline].sort(
    (a, b) => a.order - b.order
  );

  // Cache sorted pipeline
  this.sortedPipelineCache = sorted;

  // Return middleware handlers
  return sorted.map(m => {
    // Handle conditional middleware
    if (m.condition) {
      return (req, res, next) => {
        if (m.condition!(req)) {
          return m.middleware(req, res, next);
        }
        next();
      };
    }
    return m.middleware;
  });
}
```

## Middleware Resolver

### Resolution Process

1. **Check Registry**: Look up middleware name in registry
2. **Check Installation**: Verify package is installed (cached)
3. **Resolve Module**: Load module using require.resolve (cached)
4. **Invoke Factory**: Call middleware factory with options

```typescript
function middlewareResolver(
  middlewareName: RegisteredMiddlewareName | string,
  ...options: Array<any>
): ExpressHandler | null {
  // Get package name from registry
  const packageName = MIDDLEWARE_REGISTRY[middlewareName];

  if (!packageName) {
    return null;
  }

  // Check installation (cached)
  if (!isPackageInstalled(packageName)) {
    return null;
  }

  // Resolve module (cached)
  const middlewareFactory = resolveModule(packageName);
  if (!middlewareFactory) {
    return null;
  }

  // Invoke factory
  return middlewareFactory(...options);
}
```

### Caching Strategy

**Package Installation Cache:**
```typescript
const installStatusCache = new Map<string, boolean>();

function isPackageInstalled(packageName: string): boolean {
  const cached = installStatusCache.get(packageName);
  if (cached !== undefined) {
    return cached;
  }

  try {
    require.resolve(packageName, { paths: [process.cwd()] });
    installStatusCache.set(packageName, true);
    return true;
  } catch {
    installStatusCache.set(packageName, false);
    return false;
  }
}
```

**Module Cache:**
```typescript
const moduleCache = new Map<string, unknown>();

function resolveModule<T>(packageName: string): T | null {
  const cached = moduleCache.get(packageName);
  if (cached !== undefined) {
    return cached as T;
  }

  try {
    const mod = require(packageName);
    const resolved = mod.default ?? mod;
    moduleCache.set(packageName, resolved);
    return resolved as T;
  } catch (error) {
    return null;
  }
}
```

## Middleware Presets

### Preset Structure

Presets are category-based `MiddlewareConfig` records (not flat middleware
arrays). Each top-level key maps to a category method on the middleware
service.

```typescript
interface MiddlewareConfig {
  parse?: ParseOptions | boolean;
  logger?: MiddlewareLoggerConfig | boolean;
  security?: SecurityConfig | SecurityPreset | boolean;
  compress?: CompressConfig | boolean;
  session?: SessionConfig;
  static?: StaticConfig | string | Array<StaticConfig | string>;
}
```

Built-in presets live in `getBuiltInPresets()` inside
[`middleware-service.ts`](../middleware-service.ts). Available names: `api`,
`web`, `spa`, `microservice`, `graphql`, `minimal`, `development`,
`production`.

### Applying Presets

```typescript
applyPreset(
  preset: string,
  overrides?: Partial<MiddlewareConfig>
): void {
  const config = this.getPresetConfig(preset);
  if (!config) return;

  const finalConfig = overrides
    ? this.mergeConfigs(config, overrides)
    : config;

  if (finalConfig.parse)    this.parse(typeof finalConfig.parse === "object" ? finalConfig.parse : undefined);
  if (finalConfig.logger)   this.logger(typeof finalConfig.logger === "object" ? finalConfig.logger : undefined);
  if (finalConfig.security) this.security(typeof finalConfig.security === "object" || typeof finalConfig.security === "string" ? finalConfig.security : undefined);
  if (finalConfig.compress) this.compress(typeof finalConfig.compress === "object" ? finalConfig.compress : undefined);
  if (finalConfig.session)  this.session(finalConfig.session);
  if (finalConfig.static)   this.static(finalConfig.static);
}
```

Overrides deep-merge with the preset defaults per category, so callers only
need to specify the keys they want to change.

## Performance Profiling

### Profiler Architecture

```typescript
class MiddlewareProfiler {
  private timings = new Map<string, TimingEntry>();
  private pipelineTimes: Array<number> = [];
  private totalRequests = 0;

  wrap(name: string, handler: RequestHandler): RequestHandler {
    return (req, res, next) => {
      const start = performance.now();

      // Wrap next to capture completion
      const wrappedNext = (err?: Error) => {
        const duration = performance.now() - start;
        this.recordTiming(name, duration, !!err);
        next(err);
      };

      // Execute middleware
      try {
        const result = handler(req, res, wrappedNext);
        // Handle async middleware
        if (result instanceof Promise) {
          result.catch(wrappedNext);
        }
      } catch (error) {
        wrappedNext(error as Error);
      }
    };
  }
}
```

### Metrics Calculation

```typescript
getStats(): ProfilerStats {
  const metrics: Array<MiddlewareMetrics> = [];

  for (const [name, entry] of this.timings) {
    const sorted = [...entry.times].sort((a, b) => a - b);
    const count = sorted.length;

    metrics.push({
      name,
      avgExecutionMs: sorted.reduce((a, b) => a + b, 0) / count,
      minExecutionMs: sorted[0] || 0,
      maxExecutionMs: sorted[count - 1] || 0,
      p50ExecutionMs: this.percentile(sorted, 0.5),
      p95ExecutionMs: this.percentile(sorted, 0.95),
      p99ExecutionMs: this.percentile(sorted, 0.99),
      totalCalls: count,
      errors: entry.errors,
      lastExecutionAt: entry.lastExecution
    });
  }

  return {
    totalMiddleware: metrics.length,
    totalRequests: this.totalRequests,
    avgPipelineMs: this.pipelineTimes.reduce((a, b) => a + b, 0) / this.pipelineTimes.length,
    slowestMiddleware: this.findSlowest(metrics),
    fastestMiddleware: this.findFastest(metrics),
    metrics
  };
}
```

## Design Decisions

### ADR-001: Singleton Pattern

**Decision:** Use singleton pattern for Middleware service.

**Rationale:**
- One middleware configuration per application
- Consistent state across application
- Easy access via IService

### ADR-002: Ordered Pipeline

**Decision:** Preserve insertion order for middleware execution.

**Rationale:**
- Predictable execution order
- Matches Express.js behavior
- Easy to reason about

### ADR-003: Cached Resolution

**Decision:** Cache middleware module resolution.

**Rationale:**
- Performance: Avoid repeated require.resolve calls
- Memory: Modules loaded once
- Consistency: Same instance reused

### ADR-004: Preset System

**Decision:** Provide middleware presets for common configurations.

**Rationale:**
- Reduces boilerplate
- Consistent configurations
- Easy to customize with overrides

### ADR-005: Conditional Middleware

**Decision:** Support conditional middleware execution.

**Rationale:**
- Flexibility: Route-specific middleware
- Performance: Skip unnecessary processing
- Clean API: Single method for conditional logic

## Related Code

- [MiddlewareService](../middleware-service.ts) - Main service implementation (includes built-in presets)
- [MiddlewareResolver](../middleware-resolver.ts) - Package resolution
- [MiddlewareProfiler](../middleware-profiler.ts) - Performance profiling

