# Logger Transports

ExpressoTS logger supports pluggable transports for sending logs to different destinations. This document explains how to create custom transports.

## Transport Interface

All transports must implement the `ILogTransport` interface:

```typescript
interface ILogTransport {
  readonly name: string;
  level: LogLevel;
  enabled: boolean;
  log(entry: LogEntry): void | Promise<void>;
  flush?(): Promise<void>;
  close?(): Promise<void>;
}
```

## Built-in Transports

### ConsoleTransport

Outputs logs to the console with color coding and formatting.

```typescript
import { ConsoleTransport } from "@expressots/core";

// Development mode (pretty, colored)
const devTransport = ConsoleTransport.forDevelopment();

// Production mode (JSON, structured)
const prodTransport = ConsoleTransport.forProduction();
```

### FileTransport

Writes logs to files with rotation, compression, and retention policies.

```typescript
import { FileTransport } from "@expressots/core";

// Basic daily rotation
const fileTransport = FileTransport.daily({
  directory: "logs",
});

// With compression
const compressedTransport = FileTransport.withCompression({
  directory: "logs",
});

// With size limits
const sizeLimitedTransport = FileTransport.withMaxSize(10 * 1024 * 1024, {
  directory: "logs", // 10MB max
});

// With retention policy
const retentionTransport = FileTransport.withRetention(
  7 * 24 * 60 * 60 * 1000, // 7 days
  10, // Keep max 10 files
  {
    directory: "logs",
  },
);
```

### HttpTransport

Sends logs to HTTP endpoints with batching and retry logic.

```typescript
import { HttpTransport } from "@expressots/core";

// Basic HTTP transport
const httpTransport = HttpTransport.create("https://api.example.com/logs", {
  headers: {
    Authorization: "Bearer token",
  },
});

// With batching
const batchedTransport = HttpTransport.withBatching(
  "https://api.example.com/logs",
  20, // Batch size
  {
    flushInterval: 5000, // Flush every 5 seconds
    maxRetries: 3,
    retryDelay: 1000,
  },
);
```

## Creating Custom Transports

### Example: Database Transport

```typescript
import { ILogTransport } from "@expressots/core";
import { LogEntry, LogLevel } from "@expressots/core";

class DatabaseTransport implements ILogTransport {
  readonly name = "Database";
  level: LogLevel = LogLevel.INFO;
  enabled: boolean = true;
  private db: any; // Your database client

  constructor(db: any) {
    this.db = db;
  }

  async log(entry: LogEntry): Promise<void> {
    if (!this.enabled) {
      return;
    }

    await this.db.logs.insert({
      level: entry.level,
      message: entry.message,
      context: entry.context,
      timestamp: new Date(entry.timestamp),
      data: entry.data,
    });
  }

  async flush(): Promise<void> {
    // No-op for database transport
  }

  async close(): Promise<void> {
    await this.db.close();
  }
}
```

### Example: Redis Transport

```typescript
import { ILogTransport } from "@expressots/core";
import { LogEntry, LogLevel } from "@expressots/core";
import { createClient } from "redis";

class RedisTransport implements ILogTransport {
  readonly name = "Redis";
  level: LogLevel = LogLevel.INFO;
  enabled: boolean = true;
  private client: ReturnType<typeof createClient>;
  private queue: LogEntry[] = [];

  constructor(redisUrl: string) {
    this.client = createClient({ url: redisUrl });
  }

  async log(entry: LogEntry): Promise<void> {
    if (!this.enabled) {
      return;
    }

    this.queue.push(entry);

    // Batch and send every 10 entries
    if (this.queue.length >= 10) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.queue.length === 0) {
      return;
    }

    const entries = [...this.queue];
    this.queue = [];

    await this.client.lPush("logs", ...entries.map((e) => JSON.stringify(e)));
  }

  async close(): Promise<void> {
    await this.flush();
    await this.client.quit();
  }
}
```

### Example: Sentry Transport

```typescript
import { ILogTransport } from "@expressots/core";
import { LogEntry, LogLevel } from "@expressots/core";
import * as Sentry from "@sentry/node";

class SentryTransport implements ILogTransport {
  readonly name = "Sentry";
  level: LogLevel = LogLevel.ERROR; // Only send errors to Sentry
  enabled: boolean = true;

  constructor(dsn: string) {
    Sentry.init({ dsn });
  }

  async log(entry: LogEntry): Promise<void> {
    if (!this.enabled || entry.level < LogLevel.ERROR) {
      return;
    }

    if (entry.error) {
      Sentry.captureException(entry.error, {
        level: this.mapLevel(entry.level),
        tags: {
          context: entry.context,
        },
        extra: entry.data,
      });
    } else {
      Sentry.captureMessage(entry.message, {
        level: this.mapLevel(entry.level),
        tags: {
          context: entry.context,
        },
        extra: entry.data,
      });
    }
  }

  private mapLevel(level: LogLevel): Sentry.SeverityLevel {
    switch (level) {
      case LogLevel.FATAL:
        return "fatal";
      case LogLevel.ERROR:
        return "error";
      case LogLevel.WARN:
        return "warning";
      default:
        return "info";
    }
  }

  async close(): Promise<void> {
    await Sentry.close();
  }
}
```

## Using Custom Transports

```typescript
import { Logger } from "@expressots/core";
import { DatabaseTransport } from "./transports/database.transport";

const logger = new Logger();

logger.configure({
  transports: [ConsoleTransport.forDevelopment(), new DatabaseTransport(db)],
});
```

## Best Practices

1. **Error Handling**: Always handle errors gracefully to avoid log loops
2. **Async Operations**: Use async/await for I/O operations
3. **Batching**: Consider batching logs for better performance
4. **Retry Logic**: Implement retry logic for network transports
5. **Resource Cleanup**: Implement `close()` to clean up resources
6. **Level Filtering**: Respect the `level` and `enabled` properties

## Transport Lifecycle

1. **Construction**: Transport is created with configuration
2. **Configuration**: Logger calls `configure()` which may update transports
3. **Logging**: `log()` is called for each log entry
4. **Flushing**: `flush()` is called periodically or on shutdown
5. **Closing**: `close()` is called when logger is shut down

## Testing Custom Transports

```typescript
import { LogEntry, LogLevel } from "@expressots/core";
import { MyCustomTransport } from "./my-custom-transport";

describe("MyCustomTransport", () => {
  it("should log entries", async () => {
    const transport = new MyCustomTransport();
    const entry: LogEntry = {
      level: LogLevel.INFO,
      message: "Test message",
      timestamp: Date.now(),
    };

    await transport.log(entry);
    // Assert transport received the entry
  });

  it("should respect level filtering", async () => {
    const transport = new MyCustomTransport();
    transport.level = LogLevel.WARN;

    const entry: LogEntry = {
      level: LogLevel.INFO,
      message: "Should not log",
      timestamp: Date.now(),
    };

    await transport.log(entry);
    // Assert entry was not logged
  });
});
```
