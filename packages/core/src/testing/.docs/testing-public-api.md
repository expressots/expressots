# Testing Public API

> **Complete user-facing documentation for ExpressoTS testing utilities**

## Quick Start

Create a test application with minimal setup:

```typescript
import { createTestApp } from "@expressots/core";

describe("UserController", () => {
  const { app, container, request, cleanup } = await createTestApp(App);

  afterAll(async () => {
    await cleanup();
  });

  test("GET /users returns user list", async () => {
    const response = await request
      .get("/users")
      .expectStatus(200)
      .expectBody<User[]>(users => {
        expect(users).toHaveLength(10);
      })
      .execute();

    expect(response.body).toBeDefined();
  });
});
```

## Core Concepts

### Test Application

A test application provides:
- **Full App Instance**: Complete ExpressoTS application
- **DI Container**: Access to all services
- **Fluent Request Builder**: Chainable HTTP request builder
- **Automatic Cleanup**: Clean up after tests

### Fluent Request Builder

Chainable API for making HTTP requests:

```typescript
await request
  .get("/users")
  .set("Authorization", "Bearer token")
  .expectStatus(200)
  .expectBody<User[]>()
  .execute();
```

## Creating Test Applications

### Basic Test App

```typescript
const { app, container, request, cleanup } = await createTestApp(App);
```

### With Mock Providers

```typescript
const { app, container, request } = await createTestApp(App, {
  mockProviders: [
    {
      provide: UserService,
      useValue: {
        findAll: jest.fn().mockResolvedValue([mockUser]),
      },
    },
  ],
});
```

### With Environment Variables

```typescript
const { app, container, request } = await createTestApp(App, {
  env: {
    DATABASE_URL: "memory://test",
    API_KEY: "test-key",
  },
});
```

### With Options

```typescript
const { app, container, request } = await createTestApp(App, {
  port: 0, // Auto-assign port
  enableLogging: false,
  autoCleanup: true,
  skipModules: ["DatabaseModule"],
});
```

## Fluent Requests

### GET Request

```typescript
await request
  .get("/users")
  .expectStatus(200)
  .execute();
```

### POST Request

```typescript
await request
  .post("/users")
  .send({ name: "John", email: "john@example.com" })
  .expectStatus(201)
  .expectBody<User>(user => {
    expect(user.name).toBe("John");
  })
  .execute();
```

### PUT Request

```typescript
await request
  .put("/users/123")
  .send({ name: "Jane" })
  .expectStatus(200)
  .execute();
```

### DELETE Request

```typescript
await request
  .delete("/users/123")
  .expectStatus(204)
  .execute();
```

### Request Headers

```typescript
await request
  .get("/users")
  .set("Authorization", "Bearer token")
  .set("X-API-Key", "key")
  .execute();
```

### Query Parameters

```typescript
await request
  .get("/users")
  .query({ page: 1, limit: 10 })
  .execute();
```

### Authorization

```typescript
await request
  .get("/users")
  .auth("token", "Bearer")
  .execute();
```

## Assertions

### Status Assertions

```typescript
await request
  .get("/users")
  .expectStatus(200)
  .execute();
```

### Body Assertions

```typescript
// Exact match
await request
  .get("/users/123")
  .expectBody<User>({ id: 123, name: "John" })
  .execute();

// Partial match
await request
  .get("/users/123")
  .expectBody<User>({ name: "John" })
  .execute();

// Predicate
await request
  .get("/users")
  .expectBody<User[]>(users => users.length > 0)
  .execute();
```

### Header Assertions

```typescript
await request
  .get("/users")
  .expectHeaders({
    "Content-Type": "application/json",
    "X-Request-ID": /^[a-f0-9-]+$/,
  })
  .execute();
```

### Performance Assertions

```typescript
await request
  .get("/users")
  .expectTime({ lessThan: 100 }) // Response time < 100ms
  .execute();

await request
  .get("/users")
  .expectTime({ between: [50, 100] }) // Response time between 50-100ms
  .execute();
```

### Custom Assertions

```typescript
await request
  .get("/users")
  .expect(response => {
    expect(response.headers["x-pagination"]).toBeDefined();
    expect(JSON.parse(response.headers["x-pagination"])).toHaveProperty("total");
  })
  .execute();
```

## Mock Providers

### Basic Mock

```typescript
const { app, container, request } = await createTestApp(App, {
  mockProviders: [
    {
      provide: UserService,
      useValue: {
        findAll: jest.fn().mockResolvedValue([mockUser]),
        findById: jest.fn().mockResolvedValue(mockUser),
      },
    },
  ],
});
```

### Factory Mock

```typescript
const { app, container, request } = await createTestApp(App, {
  mockProviders: [
    {
      provide: UserService,
      useFactory: () => ({
        findAll: jest.fn().mockResolvedValue([mockUser]),
      }),
    },
  ],
});
```

### Class Mock

```typescript
class MockUserService {
  findAll() {
    return Promise.resolve([mockUser]);
  }
}

const { app, container, request } = await createTestApp(App, {
  mockProviders: [
    {
      provide: UserService,
      useClass: MockUserService,
    },
  ],
});
```

### Using mockProvider Helper

```typescript
import { mockProvider } from "@expressots/core";

const { service, mocks, container } = await mockProvider(UserService, {
  mocks: {
    findAll: jest.fn().mockResolvedValue([mockUser]),
  },
});
```

## Snapshot Testing

### Basic Snapshot

```typescript
import { snapshotRequest } from "@expressots/core";

await snapshotRequest(app)
  .get("/users")
  .expectSnapshot();
```

### Snapshot with Options

```typescript
await snapshotRequest(app)
  .get("/users")
  .expectSnapshot({
    ignore: ["createdAt", "updatedAt"],
    name: "user-list",
  });
```

### Update Snapshot

```typescript
await snapshotRequest(app)
  .get("/users")
  .updateSnapshot();
```

## Load Testing

### Basic Load Test

```typescript
import { loadTest } from "@expressots/core";

const results = await loadTest(app, {
  endpoint: "/users",
  method: "GET",
  concurrent: 100,
  duration: "10s",
});

console.log(`Throughput: ${results.throughput} req/s`);
console.log(`Average: ${results.averageResponseTime}ms`);
console.log(`P95: ${results.p95ResponseTime}ms`);
```

### Load Test with Assertions

```typescript
const results = await loadTest(app, {
  endpoint: "/users",
  concurrent: 1000,
  duration: "30s",
  assertions: {
    maxErrorRate: 0.01, // Max 1% errors
    minThroughput: 100, // Min 100 req/s
    maxP95: 200, // Max P95 < 200ms
  },
});

expect(results.assertionsPassed).toBe(true);
```

### Load Test with Progress

```typescript
const results = await loadTest(app, {
  endpoint: "/users",
  concurrent: 100,
  duration: "10s",
  onProgress: (progress) => {
    console.log(`RPS: ${progress.rps}, Completed: ${progress.completed}`);
  },
});
```

## Database Testing

### Create Test Database

```typescript
import { createTestDatabase } from "@expressots/core";

const db = await createTestDatabase({
  type: "in-memory",
  fixtures: [
    {
      table: "users",
      data: [mockUser1, mockUser2],
    },
  ],
});
```

### Database Operations

```typescript
// Insert
await db.insert("users", { name: "John", email: "john@example.com" });

// Find
const users = await db.find<User>("users", { name: "John" });

// Update
await db.update("users", { id: 1 }, { name: "Jane" });

// Delete
await db.delete("users", { id: 1 });

// Reset
await db.reset(); // Reset to initial fixtures
```

## Mock Context

### Create Mock Context

```typescript
import { mockContext } from "@expressots/core";

const context = mockContext({
  user: { id: 123, role: "admin" },
  headers: { "x-api-key": "test-key" },
  params: { id: "456" },
  query: { page: "1" },
});
```

### Use Mock Context

```typescript
const context = mockContext({ user: { id: 123 } });

// Use in tests
const controller = container.get(UserController);
const result = await controller.getUser(context.getRequest());
```

## API Reference

### `createTestApp(appClass, options?)`

Creates a test application.

**Parameters:**
- `appClass`: Application class
- `options`: Test app options

**Returns:** `TestAppResult` - Test app result

### `createFluentRequest(app)`

Creates fluent request builder.

**Parameters:**
- `app`: Test application

**Returns:** `FluentRequestBuilder` - Request builder

### `mockProvider(serviceClass, options?)`

Creates mock provider.

**Parameters:**
- `serviceClass`: Service class to mock
- `options`: Mock options

**Returns:** `MockProviderResult` - Mock provider result

### `snapshotRequest(app)`

Creates snapshot request builder.

**Parameters:**
- `app`: Test application

**Returns:** `SnapshotRequestBuilder` - Snapshot builder

### `loadTest(app, options)`

Runs load test.

**Parameters:**
- `app`: Test application
- `options`: Load test options

**Returns:** `LoadTestResults` - Load test results

### `createTestDatabase(options)`

Creates test database.

**Parameters:**
- `options`: Database options

**Returns:** `ITestDatabase` - Test database

### `mockContext(options)`

Creates mock context.

**Parameters:**
- `options`: Context options

**Returns:** `MockContext` - Mock context

## Troubleshooting

### Test App Not Starting

1. **Check port**: Ensure port is available
2. **Check dependencies**: Ensure all dependencies are available
3. **Check logs**: Enable logging to see errors

### Mock Providers Not Working

1. **Check registration**: Ensure providers are registered correctly
2. **Check scope**: Ensure providers are in correct scope
3. **Check overrides**: Verify overrides are applied

### Fluent Requests Failing

1. **Check status**: Verify expected status matches actual
2. **Check body**: Verify body structure matches expected
3. **Check headers**: Verify headers are set correctly

## Best Practices

1. **Clean Up**: Always call cleanup after tests
2. **Isolate Tests**: Use separate test apps for each test suite
3. **Mock External Services**: Mock external API calls
4. **Use Fixtures**: Use database fixtures for consistent data
5. **Test Edge Cases**: Test error cases and edge cases
6. **Performance Tests**: Use load tests for performance validation
7. **Snapshot Tests**: Use snapshots for regression testing

---

**See Also:**
- [Architecture Guide](./architecture.md) - Internal implementation
- [Examples](./examples/) - Code examples
- [Application Bootstrap](../application/.docs/bootstrap-public-api.md) - Application setup

