# Testing Architecture

> **Internal architecture and design decisions for ExpressoTS testing utilities**

## Overview

The testing system provides comprehensive testing utilities with:
- Zero-config test application setup
- Fluent request builder
- Mock provider system
- Snapshot testing
- Load testing
- Database testing

## Architecture Components

### 1. Test App Factory (`create-test-app.ts`)

Creates test applications with minimal configuration.

**Responsibilities:**
- Create application instance
- Set up DI container
- Configure test environment
- Provide cleanup utilities

**Key Functions:**
- `createTestApp()` - Create test application

### 2. Fluent Request Builder (`fluent-request.ts`)

Chainable API for making HTTP requests.

**Responsibilities:**
- Build HTTP requests
- Execute requests
- Assert responses
- Handle errors

**Key Classes:**
- `FluentRequestBuilder` - Request builder
- `FluentRequest` - Request chain

### 3. Mock Provider (`mock-provider.ts`)

Creates mock providers for testing.

**Responsibilities:**
- Create mock instances
- Auto-mock dependencies
- Provide mock utilities
- Handle mock lifecycle

**Key Functions:**
- `mockProvider()` - Create mock provider

### 4. Snapshot Request (`snapshot-request.ts`)

Snapshot testing utilities.

**Responsibilities:**
- Create snapshots
- Compare snapshots
- Update snapshots
- Manage snapshot files

**Key Classes:**
- `SnapshotRequestBuilder` - Snapshot builder

### 5. Load Test (`load-test.ts`)

Load testing utilities.

**Responsibilities:**
- Generate load
- Measure performance
- Collect metrics
- Assert performance

**Key Functions:**
- `loadTest()` - Run load test

### 6. Test Database (`create-test-database.ts`)

Database testing utilities.

**Responsibilities:**
- Create test databases
- Load fixtures
- Provide database operations
- Clean up databases

**Key Functions:**
- `createTestDatabase()` - Create test database

### 7. Mock Context (`mock-context.ts`)

Mock request context utilities.

**Responsibilities:**
- Create mock requests
- Create mock responses
- Provide context utilities

**Key Functions:**
- `mockContext()` - Create mock context

## Data Flow

```
Test starts
    ↓
createTestApp()
    ↓
Create application instance
    ↓
Set up DI container
    ↓
Configure test environment
    ↓
Provide test utilities
    ↓
Test executes
    ↓
Cleanup
```

## Test Application Setup

### Setup Process

1. **Create App Instance**: Create application instance
2. **Configure Container**: Set up DI container
3. **Apply Mocks**: Apply mock providers
4. **Start Server**: Start test server
5. **Create Utilities**: Create request builder, etc.

### Configuration Options

- **Mock Providers**: Override providers with mocks
- **Environment Variables**: Set test environment
- **Port**: Configure test server port
- **Logging**: Enable/disable logging
- **Auto Cleanup**: Automatic cleanup after tests

## Fluent Request Builder

### Request Building

1. **Method Selection**: Choose HTTP method
2. **Path Setting**: Set request path
3. **Header Setting**: Set request headers
4. **Body Setting**: Set request body
5. **Query Setting**: Set query parameters

### Execution

1. **Request Execution**: Execute HTTP request
2. **Response Capture**: Capture response
3. **Assertion Execution**: Execute assertions
4. **Result Return**: Return response

### Assertions

- **Status Assertions**: Assert status codes
- **Body Assertions**: Assert response body
- **Header Assertions**: Assert response headers
- **Performance Assertions**: Assert response time
- **Custom Assertions**: Custom assertion functions

## Mock Provider System

### Mock Creation

1. **Service Identification**: Identify service to mock
2. **Mock Generation**: Generate mock implementation
3. **Dependency Mocking**: Auto-mock dependencies
4. **Container Registration**: Register mock in container

### Mock Types

- **Value Mock**: Direct value mock
- **Factory Mock**: Factory function mock
- **Class Mock**: Class-based mock
- **Auto Mock**: Automatic mock generation

## Snapshot Testing

### Snapshot Process

1. **Request Execution**: Execute request
2. **Snapshot Creation**: Create snapshot
3. **Comparison**: Compare with existing snapshot
4. **Update**: Update snapshot if needed

### Snapshot Management

- **File Storage**: Store snapshots in files
- **Version Control**: Track snapshot changes
- **Update Mode**: Update snapshots when needed
- **Ignore Fields**: Ignore dynamic fields

## Load Testing

### Load Generation

1. **Concurrency Setup**: Set up concurrent requests
2. **Request Generation**: Generate requests
3. **Execution**: Execute requests
4. **Metrics Collection**: Collect performance metrics

### Metrics Collection

- **Response Time**: Track response times
- **Throughput**: Measure requests per second
- **Error Rate**: Track error rates
- **Percentiles**: Calculate percentiles (P95, P99)

## Database Testing

### Database Setup

1. **Database Creation**: Create test database
2. **Schema Migration**: Run migrations
3. **Fixture Loading**: Load test fixtures
4. **Cleanup Setup**: Set up cleanup

### Database Operations

- **CRUD Operations**: Create, read, update, delete
- **Query Operations**: Query with conditions
- **Transaction Support**: Support transactions
- **Fixture Management**: Manage test fixtures

## Extension Points

### Custom Request Builders

Create custom request builders:

```typescript
export class CustomRequestBuilder extends FluentRequestBuilder {
  // Custom methods
}
```

### Custom Mock Providers

Create custom mock providers:

```typescript
export function customMockProvider(service) {
  // Custom mocking logic
}
```

### Custom Test Utilities

Create custom test utilities:

```typescript
export function customTestUtility(app) {
  // Custom utility logic
}
```

## Performance Considerations

1. **Lazy Initialization**: Initialize on demand
2. **Resource Cleanup**: Clean up resources after tests
3. **Parallel Execution**: Support parallel test execution
4. **Mock Caching**: Cache mock instances

## Design Decisions

### Why Fluent API?

- **Readability**: More readable test code
- **Chainability**: Easy to chain operations
- **Type Safety**: Full TypeScript support

### Why Mock Providers?

- **Isolation**: Isolate units under test
- **Flexibility**: Easy to mock dependencies
- **Type Safety**: Type-safe mocking

### Why Snapshot Testing?

- **Regression Testing**: Catch regressions
- **Ease of Use**: Easy to use
- **Maintenance**: Easy to maintain

### Why Load Testing?

- **Performance Validation**: Validate performance
- **Capacity Planning**: Plan capacity
- **Bottleneck Identification**: Identify bottlenecks

## Future Enhancements

1. **Test Coverage**: Test coverage utilities
2. **Visual Testing**: Visual regression testing
3. **API Testing**: API contract testing
4. **Performance Profiling**: Performance profiling utilities

---

**See Also:**
- [Public API](./testing-public-api.md) - User-facing documentation
- [Examples](./examples/) - Code examples

