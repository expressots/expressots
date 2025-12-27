/**
 * Health Check Provider Example
 *
 * This example demonstrates providers with health check capability.
 *
 * @example
 * ```bash
 * # Run this example
 * ts-node examples/health-check-provider.example.ts
 * ```
 */

import {
  IProvider,
  IHealthCheck,
  HealthCheckResult,
  provideSingleton,
} from "../index";

// Example 1: Database provider with health check
@provideSingleton(DatabaseProvider)
export class DatabaseProvider implements IProvider, IHealthCheck {
  readonly name = "Database Provider";
  private connected: boolean = true;
  private connectionCount: number = 5;

  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();

    try {
      // Simulate database ping
      await new Promise((resolve) => setTimeout(resolve, 10));

      return {
        status: this.connected ? "healthy" : "unhealthy",
        latency: Date.now() - start,
        details: {
          connections: this.connectionCount,
          connected: this.connected,
        },
      };
    } catch (error) {
      return {
        status: "unhealthy",
        latency: Date.now() - start,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

// Example 2: Cache provider with degraded status
@provideSingleton(CacheProvider)
export class CacheProvider implements IProvider, IHealthCheck {
  readonly name = "Cache Provider";
  private responseTime: number = 50;

  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();

    // Simulate cache ping
    await new Promise((resolve) => setTimeout(resolve, this.responseTime));
    const latency = Date.now() - start;

    // Degraded if response time is high
    let status: "healthy" | "degraded" | "unhealthy" = "healthy";
    if (latency > 200) {
      status = "degraded";
    } else if (latency > 500) {
      status = "unhealthy";
    }

    return {
      status,
      latency,
      message: latency > 200 ? "High response time detected" : undefined,
      details: {
        responseTime: latency,
        threshold: 200,
      },
    };
  }
}

// Example 3: External service provider
@provideSingleton(ExternalServiceProvider)
export class ExternalServiceProvider implements IProvider, IHealthCheck {
  readonly name = "External Service Provider";
  private isAvailable: boolean = true;

  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();

    try {
      // Simulate external service check
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (!this.isAvailable) {
        return {
          status: "unhealthy",
          latency: Date.now() - start,
          message: "External service unavailable",
        };
      }

      return {
        status: "healthy",
        latency: Date.now() - start,
        details: {
          service: "external-api",
          version: "1.0.0",
        },
      };
    } catch (error) {
      return {
        status: "unhealthy",
        latency: Date.now() - start,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

// Example usage
if (require.main === module) {
  console.log("Health Check Provider Examples");
  console.log("==============================");
  console.log("\n1. DatabaseProvider - Basic health check");
  console.log("2. CacheProvider - Degraded status detection");
  console.log("3. ExternalServiceProvider - External service check");
}

export { DatabaseProvider, CacheProvider, ExternalServiceProvider };
