# Lazy Loading Architecture

> **Internal architecture and design decisions for ExpressoTS lazy loading system**

## Overview

The lazy loading system provides on-demand module loading with:
- Preload hints for optimization
- Usage analytics and recommendations
- Progressive loading with phases
- Background warmup during idle time
- Module status tracking

## Architecture Components

### 1. Lazy Module (`lazy-module.ts`)

Core lazy module implementation.

**Responsibilities:**
- Manage module load status
- Load/unload modules on demand
- Track load time and errors
- Handle load promises
- Support preload hints

**Key Methods:**
- `load()` - Load module
- `unload()` - Unload module
- `withPreloadHint()` - Set preload hint
- `withPrefetchOn()` - Set prefetch routes

### 2. Lazy Module Loader (`lazy-module-loader.ts`)

Handles actual module loading.

**Responsibilities:**
- Load ContainerModule instances
- Handle load errors
- Track load metrics
- Support timeouts

**Key Methods:**
- `loadModule()` - Load module
- `unloadModule()` - Unload module

### 3. Lazy Module Manager (`lazy-module-manager.ts`)

Manages all lazy modules.

**Responsibilities:**
- Register modules
- Track module status
- Provide analytics
- Generate recommendations

**Key Methods:**
- `register()` - Register module
- `get()` - Get module by name
- `getMetrics()` - Get module metrics
- `getRecommendations()` - Get recommendations

### 4. Lazy Module Warmup (`lazy-module-warmup.ts`)

Warms up modules in background.

**Responsibilities:**
- Warm up high-priority modules
- Warm up during idle time
- Handle warmup errors
- Track warmup progress

**Key Methods:**
- `warmup()` - Warm up module
- `warmupHighPriority()` - Warm up high-priority modules

### 5. Lazy Load Metrics (`lazy-load-metrics.ts`)

Tracks module usage metrics.

**Features:**
- Load count tracking
- Load time tracking
- Error tracking
- Usage pattern analysis

## Data Flow

```
User accesses route
    ↓
Check if module loaded
    ↓
If not loaded:
  - Check preload hint
  - Load module
  - Track metrics
    ↓
Module loaded
    ↓
Access granted
```

## Preload Hints

### Hint Levels

- **high**: Preload during startup idle time
- **medium**: Preload after high-priority modules
- **low**: Only load when accessed (default)
- **never**: Never preload, always on-demand

### Preload Strategy

1. **Startup**: Load high-priority modules during idle time
2. **Idle Time**: Load medium-priority modules after user idle
3. **On-Demand**: Load low-priority modules when accessed
4. **Never**: Always load on-demand

## Module Loading

### Load Process

1. **Check Status**: Verify module not already loaded
2. **Check Dependencies**: Ensure dependencies are loaded
3. **Load Module**: Load ContainerModule
4. **Track Metrics**: Record load time and status
5. **Update Status**: Update module status

### Error Handling

- **Timeout Errors**: Handle load timeouts
- **Dependency Errors**: Handle missing dependencies
- **Load Errors**: Handle module load failures
- **Retry Logic**: Retry failed loads (optional)

## Usage Analytics

### Metrics Collected

- **Load Count**: Number of times loaded
- **Load Time**: Average load time
- **Error Count**: Number of load errors
- **Last Load Time**: Timestamp of last load
- **Usage Frequency**: How often module is accessed

### Recommendations

System generates recommendations based on:
- Usage frequency
- Load time
- Error rate
- Preload hint

## Background Warmup

### Warmup Strategy

1. **Idle Detection**: Detect user idle time
2. **Priority Selection**: Select modules by priority
3. **Background Loading**: Load modules in background
4. **Progress Tracking**: Track warmup progress

### Warmup Phases

1. **High Priority**: Warm up high-priority modules first
2. **Medium Priority**: Warm up medium-priority modules next
3. **Low Priority**: Warm up low-priority modules last

## Extension Points

### Custom Loaders

Create custom module loaders:

```typescript
export class CustomModuleLoader extends LazyModuleLoader {
  // Custom loading logic
}
```

### Custom Managers

Extend LazyModuleManager:

```typescript
export class CustomModuleManager extends LazyModuleManager {
  // Custom management logic
}
```

### Custom Metrics

Add custom metrics:

```typescript
export class CustomMetrics extends LazyLoadMetrics {
  // Custom metrics collection
}
```

## Performance Considerations

1. **Lazy Loading**: Only load when needed
2. **Preload Hints**: Optimize loading strategy
3. **Background Warmup**: Warm up during idle time
4. **Caching**: Cache loaded modules
5. **Metrics**: Track performance metrics

## Design Decisions

### Why Preload Hints?

- **Flexibility**: Control loading strategy
- **Performance**: Optimize startup time
- **User Experience**: Improve perceived performance

### Why Usage Analytics?

- **Optimization**: Identify optimization opportunities
- **Recommendations**: Generate loading recommendations
- **Monitoring**: Monitor module usage patterns

### Why Background Warmup?

- **Performance**: Improve response times
- **User Experience**: Load modules before needed
- **Efficiency**: Use idle time effectively

## Future Enhancements

1. **Predictive Loading**: Predict module needs
2. **Module Splitting**: Split large modules
3. **Load Balancing**: Balance load across modules
4. **Advanced Analytics**: More detailed analytics

---

**See Also:**
- [Public API](./lazy-loading-public-api.md) - User-facing documentation
- [Examples](./examples/) - Code examples

