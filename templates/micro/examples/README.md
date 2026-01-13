# ExpressoTS Micro Examples

This folder contains examples demonstrating the advanced features available in ExpressoTS Micro.

## Running Examples

Each example can be run independently using the provided npm scripts:

```bash
# Circuit Breaker - Fault tolerance pattern
npm run example:circuit-breaker

# Service Discovery - Service registration and load balancing
npm run example:service-discovery

# Service Client - HTTP client with retries
npm run example:service-client

# Full DI API - Upgrade path with dependency injection
npm run example:full-di-api
```

For the serverless example, see the deployment instructions in the file.

## Examples Overview

### 1. Circuit Breaker (`circuit-breaker.example.ts`)

Demonstrates the Circuit Breaker pattern for protecting your service from cascading failures:

- **CLOSED**: Normal operation, requests pass through
- **OPEN**: Requests fail immediately (service unavailable)
- **HALF_OPEN**: Testing if service has recovered

Key features:
- Configurable failure and success thresholds
- Automatic recovery after timeout
- Manual reset and open controls
- Statistics and monitoring

### 2. Service Discovery (`service-discovery.example.ts`)

Shows how to implement service discovery for microservices:

- Static service registration
- Round-robin load balancing
- Health status tracking
- Dynamic service registration/deregistration

Use cases:
- Microservice architecture
- Multiple service instances
- Blue/green deployments

### 3. Service Client (`service-client.example.ts`)

Demonstrates HTTP client for service-to-service communication:

- Automatic retries with exponential backoff
- Request timeouts
- Circuit breaker integration
- Custom headers per request
- Query parameter handling

Use cases:
- API Gateway pattern
- Service composition
- External API calls

### 4. Serverless Lambda (`serverless-lambda.example.ts`)

Shows how to deploy to AWS Lambda:

- Same code works locally and on Lambda
- AWS SAM template example
- Environment-aware configuration
- Binary content handling

Deployment steps included in the file.

### 5. Full DI API (`full-di-api.example.ts`)

Upgrade path from simple `micro()` to full `createMicroAPI()`:

- Dependency injection container
- Provider registration (singleton, transient)
- Middleware pipeline
- Route management

## Feature Comparison

| Feature | micro() | createMicroAPI() |
|---------|---------|------------------|
| Simple routing | ✅ | ✅ |
| Auto-response | ✅ | ❌ |
| Middleware | ✅ basic | ✅ pipeline |
| DI Container | ❌ | ✅ |
| Provider registration | ❌ | ✅ |

## When to Use What

### Use `micro()` when:
- Building simple APIs or serverless functions
- Prototyping quickly
- Don't need dependency injection
- Want minimal boilerplate

### Use `createMicroAPI()` when:
- Building larger microservices
- Need dependency injection
- Need advanced middleware pipeline
- Building with provider pattern

### Use Circuit Breaker when:
- Calling external/unreliable services
- Need fault tolerance
- Want to prevent cascading failures

### Use Service Discovery when:
- Running multiple service instances
- Need load balancing
- Building microservice mesh

### Use Service Client when:
- Service-to-service communication
- Need automatic retries
- Want circuit breaker on HTTP calls

## Learn More

- [ExpressoTS Documentation](https://expresso-ts.com)
- [Advanced Features Guide](../ADVANCED.md)
- [Upgrading Guide](../UPGRADING.md)
