# Authorization System - Public API

> 🎯 **Goal**: Protect your routes with powerful, flexible authorization guards

## Quick Start

```typescript
import { setupAuthorization, UseGuards, Guard } from "@expressots/core";
import { AuthenticatedGuard } from "./guards/authenticated.guard";

// 1. Setup authorization in your app
export class App extends AppExpress {
  configureServices(): void {
    setupAuthorization(this.container);
  }
}

// 2. Create a guard
@Guard({ priority: 1 })
export class AuthenticatedGuard implements IGuard {
  async canActivate(context: GuardContext): Promise<GuardResult> {
    const isAuthenticated = await context.principal.isAuthenticated();
    return isAuthenticated ? GuardResult.allow() : GuardResult.deny();
  }
}

// 3. Apply guards to routes
@UseGuards(AuthenticatedGuard)
@controller("/users")
export class UserController {
  @Get("/")
  getUsers() {
    // Protected by AuthenticatedGuard
  }
}
```

---

## Progressive Enhancement

### Level 1: Basic Guard

```typescript
@Guard()
export class SimpleGuard implements IGuard {
  async canActivate(context: GuardContext): Promise<GuardResult> {
    return GuardResult.allow();
  }
}
```

### Level 2: Authentication Guard

```typescript
@Guard({ priority: 1 })
export class AuthenticatedGuard implements IGuard {
  async canActivate(context: GuardContext): Promise<GuardResult> {
    const isAuthenticated = await context.principal.isAuthenticated();
    if (!isAuthenticated) {
      return GuardResult.deny(AppError.unauthorized("Please login"));
    }
    return GuardResult.allow();
  }
}
```

### Level 3: Role-Based Guard

```typescript
@Guard({ priority: 50, cacheable: true })
export class RoleGuard implements IGuard {
  constructor(private requiredRole: string) {}
  
  async canActivate(context: GuardContext): Promise<GuardResult> {
    const hasRole = await context.principal.isInRole(this.requiredRole);
    return hasRole ? GuardResult.allow() : GuardResult.deny();
  }
}

// Usage
@UseGuards(AuthenticatedGuard, new RoleGuard("admin"))
@controller("/admin")
export class AdminController { }
```

---

## Core Concepts

### Guards

Guards are classes that implement `IGuard` and decide whether a request should proceed.

**Key Features:**
- Execute in priority order
- Can be cached within request scope
- Have access to full request context
- Return allow/deny decisions

### Guard Context

Every guard receives a `GuardContext` with:
- `request` - Express request object
- `response` - Express response object
- `principal` - Authenticated user
- `container` - DI container (request-scoped)
- `scope` - Request scope (tenant, session, etc.)
- `route` - Route metadata

### Guard Result

Guards return `GuardResult`:
- `GuardResult.allow()` - Request proceeds
- `GuardResult.deny(error?)` - Request blocked

---

## API Reference

### `setupAuthorization(container, config?)`

Setup authorization system with optional configuration.

**Parameters:**

- `container` - DI container from your app
- `config` - Optional authorization configuration (see below)

**Example:**

```typescript
setupAuthorization(this.container, {
  enablePreloading: true,
  enableCaching: true,
  defaultGuardPriority: 100
});
```

### `@Guard(options?)`

Decorator to mark a class as a guard (for auto-discovery).

**Options:**

- `priority?: number` - Execution priority (lower = earlier). Default: 100
- `cacheable?: boolean` - Whether result can be cached. Default: false

**Example:**

```typescript
@Guard({ priority: 1, cacheable: true })
export class MyGuard implements IGuard { }
```

### `@UseGuards(...guards)`

Apply guards at controller or method level.

**Parameters:**

- `guards` - Guard classes or instances to apply

**Example:**

```typescript
@UseGuards(AuthenticatedGuard, RoleGuard)
@controller("/users")
export class UserController { }
```

### `IGuard` Interface

```typescript
interface IGuard {
  canActivate(context: GuardContext): Promise<GuardResult | boolean>;
  priority?: number;
  cacheable?: boolean;
  cacheKey?: (context: GuardContext) => string;
}
```

### `GuardContext` Interface

```typescript
interface GuardContext {
  request: Request;
  response: Response;
  principal: Principal;
  container: Container;
  scope: GuardScope;
  route: RouteMetadata;
  getScoped<T>(identifier: ServiceIdentifier<T>, scopeName?: string): T;
  getTenantId(): string | undefined;
  getRequestId(): string;
}
```

### `GuardResult` Class

```typescript
class GuardResult {
  readonly allowed: boolean;
  readonly error?: AppError;
  
  static allow(): GuardResult;
  static deny(error?: AppError): GuardResult;
}
```

---

## Real-World Scenarios

### 🏢 Scenario: Role-Based Access Control

```typescript
@Guard({ priority: 50 })
export class RoleGuard implements IGuard {
  constructor(private requiredRole: string) {}
  
  async canActivate(context: GuardContext): Promise<GuardResult> {
    const hasRole = await context.principal.isInRole(this.requiredRole);
    return hasRole ? GuardResult.allow() : GuardResult.deny();
  }
}

@UseGuards(AuthenticatedGuard, new RoleGuard("admin"))
@controller("/admin")
export class AdminController { }
```

### 🔐 Scenario: Resource Ownership

```typescript
@Guard({ priority: 100 })
export class ResourceOwnerGuard implements IGuard {
  async canActivate(context: GuardContext): Promise<GuardResult> {
    const resourceId = context.route.params.id;
    const isOwner = await context.principal.isResourceOwner(resourceId);
    return isOwner ? GuardResult.allow() : GuardResult.deny();
  }
}

@UseGuards(AuthenticatedGuard, ResourceOwnerGuard)
@controller("/users/:id")
export class UserController {
  @Get("/")
  getUser(@param("id") id: string) {
    // Only accessible by resource owner
  }
}
```

### 🚀 Scenario: Permission-Based Access

```typescript
@Guard({ priority: 75, cacheable: true })
export class PermissionGuard implements IGuard {
  constructor(private permission: string) {}
  
  cacheKey = (context) => `perm:${this.permission}:${context.principal.details.id}`;
  
  async canActivate(context: GuardContext): Promise<GuardResult> {
    const permissionService = context.getScoped<IPermissionService>("IPermissionService");
    const hasPermission = await permissionService.hasPermission(
      context.principal,
      this.permission
    );
    return hasPermission ? GuardResult.allow() : GuardResult.deny();
  }
}

@UseGuards(AuthenticatedGuard, new PermissionGuard("users:read"))
@controller("/users")
export class UserController { }
```

### 🏗️ Scenario: Multi-Tenant Authorization

```typescript
@Guard({ priority: 10 })
export class TenantGuard implements IGuard {
  async canActivate(context: GuardContext): Promise<GuardResult> {
    const tenantId = context.getTenantId();
    if (!tenantId) {
      return GuardResult.deny(AppError.badRequest("Tenant ID required"));
    }
    
    // Verify tenant access
    const hasAccess = await verifyTenantAccess(context.principal, tenantId);
    return hasAccess ? GuardResult.allow() : GuardResult.deny();
  }
}

@UseGuards(TenantGuard, AuthenticatedGuard)
@controller("/:tenantId/data")
export class DataController { }
```

---

## Common Patterns

### Pattern 1: Simple Authentication

```typescript
@Guard({ priority: 1 })
export class AuthenticatedGuard implements IGuard {
  async canActivate(context: GuardContext): Promise<GuardResult> {
    return await context.principal.isAuthenticated()
      ? GuardResult.allow()
      : GuardResult.deny(AppError.unauthorized());
  }
}
```

### Pattern 2: Cached Guard

```typescript
@Guard({ priority: 50, cacheable: true })
export class CachedGuard implements IGuard {
  cacheKey = (context) => `guard:${context.principal.details.id}`;
  
  async canActivate(context: GuardContext): Promise<GuardResult> {
    // Expensive check - cached for request scope
    return GuardResult.allow();
  }
}
```

### Pattern 3: Conditional Guard

```typescript
@Guard()
export class ConditionalGuard implements IGuard {
  constructor(private condition: () => boolean) {}
  
  async canActivate(context: GuardContext): Promise<GuardResult> {
    return this.condition() ? GuardResult.allow() : GuardResult.deny();
  }
}

// Usage
@UseGuards(new ConditionalGuard(() => process.env.NODE_ENV === "production"))
```

### Pattern 4: Composite Guard

```typescript
@Guard()
export class CompositeGuard implements IGuard {
  constructor(private guards: IGuard[]) {}
  
  async canActivate(context: GuardContext): Promise<GuardResult> {
    for (const guard of this.guards) {
      const result = await guard.canActivate(context);
      if (!result.allowed) {
        return result;
      }
    }
    return GuardResult.allow();
  }
}
```

---

## Troubleshooting

### ❌ Guard Not Executing

**Issue**: Guard is not being called

**Solutions**:

1. Ensure `setupAuthorization()` is called in `configureServices()`
2. Check guard is decorated with `@Guard()`
3. Verify `@UseGuards()` is applied correctly
4. Check guard priority (may be skipped if earlier guard denies)

### ❌ Guard Always Denies

**Issue**: Guard always returns deny

**Solutions**:

1. Check `principal.isAuthenticated()` returns true
2. Verify role/permission checks are correct
3. Check guard logic for early returns
4. Use logging to debug guard execution

### ❌ Cache Not Working

**Issue**: Guard results not being cached

**Solutions**:

1. Set `cacheable: true` in `@Guard()` options
2. Ensure `enableCaching: true` in setup config
3. Check cache key is consistent
4. Verify guard returns `GuardResult.allow()` (only allowed results are cached)

---

## Best Practices

1. **Use Priority Ordering**: Authentication guards (priority 1-10) before authorization (50-100)
2. **Cache Expensive Checks**: Use `cacheable: true` for guards with expensive operations
3. **Fail Fast**: Return deny early if basic checks fail
4. **Use Built-in Guards**: Leverage `RequireAuth()`, `RequireRole()`, etc. when possible
5. **Test Guards Independently**: Unit test guards separately from controllers
6. **Document Guard Behavior**: Add comments explaining guard logic

---

## Related Documentation

- [Architecture Guide](./architecture.md) - Internal implementation details
- [Decision Log](./decision-log.md) - Design decisions
- [Examples](./examples/) - Runnable code examples

