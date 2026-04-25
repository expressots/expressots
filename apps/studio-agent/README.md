# @expressots/studio-agent

Instrumentation agent for ExpressoTS Studio - provides route discovery, OpenTelemetry tracing, and request recording.

## Features

- **Route Discovery**: Automatically scans your ExpressoTS application to discover all routes, controllers, and services
- **OpenTelemetry Tracing**: Full distributed tracing with automatic instrumentation
- **Request Recording**: Record and replay HTTP requests for debugging
- **WebSocket Communication**: Real-time updates to Studio UI
- **Metrics Collection**: P50/P95/P99 latency, error rates, and more

## Installation

```bash
npm install @expressots/studio-agent
```

## Quick Start

```typescript
import { StudioAgent } from '@expressots/studio-agent';

const agent = new StudioAgent({
  port: 3334,
  serviceName: 'my-app',
  enableRecording: true,
});

// Start the agent
await agent.start();

// Use the middleware (optional, for request recording)
app.use(agent.createMiddleware());

// Get discovered routes
const routes = agent.getRoutes();

// Stop when done
await agent.stop();
```

## Configuration

```typescript
interface AgentConfig {
  /** Port for the agent WebSocket server (default: 3334) */
  port: number;
  
  /** Path to store SQLite database (default: '.studio/studio.db') */
  dbPath: string;
  
  /** Enable request/response recording (default: true) */
  enableRecording: boolean;
  
  /** Maximum number of recorded exchanges to keep (default: 1000) */
  maxRecordedExchanges: number;
  
  /** Enable performance profiling (default: true) */
  enableProfiling: boolean;
  
  /** Sample rate for tracing 0-1 (default: 1.0) */
  traceSampleRate: number;
  
  /** Custom service name (default: 'expressots-app') */
  serviceName: string;
  
  /** Express app instance for runtime route scanning */
  expressApp?: any;
}
```

## Components

### StudioAgent

Main orchestrator that coordinates all functionality.

### RouteScanner

Scans TypeScript source files to discover routes and their metadata:

```typescript
import { RouteScanner } from '@expressots/studio-agent';

const scanner = new RouteScanner('./src');
const structure = await scanner.scan();

console.log(structure.controllers);
console.log(structure.services);
console.log(structure.dependencies);
```

### RequestRecorder

Records HTTP requests/responses for later replay:

```typescript
import { RequestRecorder } from '@expressots/studio-agent';

const recorder = new RequestRecorder('.studio/studio.db');
await recorder.initialize();

// Get recent exchanges
const exchanges = recorder.getRecentExchanges(100);

// Search by path
const results = recorder.searchExchanges('/api/users', 'GET');
```

### StudioTracer

OpenTelemetry tracer with custom span processing:

```typescript
import { StudioTracer } from '@expressots/studio-agent';

const tracer = new StudioTracer('my-service');
await tracer.start((trace) => {
  console.log('Trace completed:', trace.traceId);
});

// Create custom spans
await tracer.createSpan('my-operation', async () => {
  // Your code here
}, { attribute: 'value' });
```

## WebSocket Events

The agent emits real-time events to connected clients:

| Event | Description |
|-------|-------------|
| `routes` | Discovered routes |
| `trace` | Completed trace |
| `request` | New request recorded |
| `metrics` | Updated metrics |
| `structure` | Application structure |

## License

MIT © ExpressoTS
