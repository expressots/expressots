import { Logger } from "./logger.provider";
import { formatMemory } from "./logger.metrics";

/**
 * Health status data.
 * @public API
 */
export interface HealthStatus {
  /** Application uptime in milliseconds */
  uptime: number;
  /** Uptime formatted as human-readable string */
  uptimeFormatted: string;
  /** Memory usage in bytes */
  memoryUsage: number;
  /** Memory usage formatted (e.g., "45MB") */
  memoryUsageFormatted: string;
  /** Memory usage percentage (heap used / heap total) */
  memoryUsagePercent: number;
  /** CPU usage percentage (if available) */
  cpuUsage?: number;
  /** External service statuses */
  services?: Record<string, ServiceStatus>;
  /** Timestamp of health check */
  timestamp: number;
}

/**
 * External service status.
 * @public API
 */
export interface ServiceStatus {
  /** Service name */
  name: string;
  /** Service status: 'healthy', 'degraded', 'unhealthy' */
  status: "healthy" | "degraded" | "unhealthy";
  /** Response time in milliseconds (if applicable) */
  responseTime?: number;
  /** Error message if unhealthy */
  error?: string;
  /** Last checked timestamp */
  lastChecked: number;
}

/**
 * Health check configuration.
 * @public API
 */
export interface HealthConfig {
  /** Enable periodic health logging */
  enabled?: boolean;
  /** Interval between health checks in milliseconds (default: 60000 = 60s) */
  interval?: number;
  /** Memory usage threshold percentage (default: 80) */
  memoryThreshold?: number;
  /** CPU usage threshold percentage (default: 90) */
  cpuThreshold?: number;
  /** Enable alert logging when thresholds are exceeded */
  alertsEnabled?: boolean;
  /** Custom health check functions for external services */
  serviceChecks?: Array<() => Promise<ServiceStatus>>;
  /** Log level for health status logs (default: 'info') */
  logLevel?: "info" | "debug";
  /** Log level for alerts (default: 'warn') */
  alertLogLevel?: "warn" | "error";
}

/**
 * Get default health configuration.
 * @param environment - Current environment
 * @returns Default health config
 * @public API
 */
export function getDefaultHealthConfig(
  environment?: string,
): Required<Omit<HealthConfig, "serviceChecks">> {
  const isDev = environment === "development" || !environment;

  return {
    enabled: !isDev, // Enabled in production by default
    interval: 60000, // 60 seconds
    memoryThreshold: 80, // 80%
    cpuThreshold: 90, // 90%
    alertsEnabled: true,
    logLevel: "info",
    alertLogLevel: "warn",
  };
}

/**
 * Format uptime as human-readable string.
 * @param ms - Milliseconds
 * @returns Formatted string (e.g., "2h 30m 15s")
 * @public API
 */
export function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Collect current health status.
 * @param serviceChecks - Optional service check functions
 * @returns Health status
 * @public API
 */
export async function collectHealthStatus(
  serviceChecks?: Array<() => Promise<ServiceStatus>>,
): Promise<HealthStatus> {
  const uptime = process.uptime() * 1000; // Convert to milliseconds
  const memory = process.memoryUsage();
  const memoryUsage = memory.heapUsed;
  const memoryTotal = memory.heapTotal;
  const memoryUsagePercent = (memoryUsage / memoryTotal) * 100;

  // CPU usage is calculated by HealthMonitor over time (requires sampling interval)
  // Real CPU percentage requires measuring over an interval, so it's undefined here
  const cpuUsagePercent = undefined; // Will be calculated by HealthMonitor over time

  // Collect external service statuses
  const services: Record<string, ServiceStatus> = {};
  if (serviceChecks && serviceChecks.length > 0) {
    for (const check of serviceChecks) {
      try {
        const status = await check();
        services[status.name] = status;
      } catch (error) {
        // If service check fails, mark as unhealthy
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        services[errorMessage] = {
          name: errorMessage,
          status: "unhealthy",
          error: errorMessage,
          lastChecked: Date.now(),
        };
      }
    }
  }

  return {
    uptime,
    uptimeFormatted: formatUptime(uptime),
    memoryUsage,
    memoryUsageFormatted: formatMemory(memoryUsage),
    memoryUsagePercent: Math.round(memoryUsagePercent * 100) / 100, // Round to 2 decimals
    cpuUsage: cpuUsagePercent,
    services: Object.keys(services).length > 0 ? services : undefined,
    timestamp: Date.now(),
  };
}

/**
 * Health monitor for periodic health checks and alerts.
 * @public API
 */
export class HealthMonitor {
  private logger: Logger;
  private config: Required<Omit<HealthConfig, "serviceChecks">> & {
    serviceChecks?: Array<() => Promise<ServiceStatus>>;
  };
  private intervalId: NodeJS.Timeout | null = null;
  private startTime: number;
  private lastCpuUsage: NodeJS.CpuUsage | null = null;
  private lastCpuCheck: number = 0;

  /**
   * Create a new health monitor.
   * @param logger - Logger instance
   * @param config - Health configuration
   */
  constructor(logger: Logger, config: Partial<HealthConfig> = {}) {
    this.logger = logger;
    const environment = process.env.NODE_ENV;
    const defaults = getDefaultHealthConfig(environment);
    this.config = { ...defaults, ...config };
    this.startTime = Date.now();
    this.lastCpuCheck = Date.now();
    this.lastCpuUsage = process.cpuUsage();
  }

  /**
   * Start periodic health monitoring.
   */
  start(): void {
    if (!this.config.enabled) {
      return;
    }

    if (this.intervalId) {
      this.stop();
    }

    // Initial health check
    this.checkHealth();

    // Set up periodic checks
    this.intervalId = setInterval(() => {
      this.checkHealth();
    }, this.config.interval);
  }

  /**
   * Stop periodic health monitoring.
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Perform a health check and log results.
   */
  private async checkHealth(): Promise<void> {
    try {
      const health = await collectHealthStatus(this.config.serviceChecks);

      // Calculate CPU usage over the interval
      const now = Date.now();
      const timeDelta = now - this.lastCpuCheck;
      
      // Need at least 100ms interval for accurate CPU measurement
      if (timeDelta >= 100 && this.lastCpuUsage) {
        const currentCpuUsage = process.cpuUsage();
        const cpuDelta = {
          user: currentCpuUsage.user - this.lastCpuUsage.user,
          system: currentCpuUsage.system - this.lastCpuUsage.system,
        };
        // Convert microseconds to milliseconds, then to percentage
        // CPU percentage = (CPU time / wall clock time) * 100
        const cpuTimeMs = (cpuDelta.user + cpuDelta.system) / 1000;
        const cpuPercent = (cpuTimeMs / timeDelta) * 100;
        health.cpuUsage = Math.round(cpuPercent * 100) / 100; // Round to 2 decimals

        this.lastCpuUsage = currentCpuUsage;
        this.lastCpuCheck = now;
      } else if (timeDelta < 100) {
        // First check or interval too short - update baseline but don't calculate CPU
        this.lastCpuUsage = process.cpuUsage();
        this.lastCpuCheck = now;
      }

      // Log health status
      const logLevel = this.config.logLevel || "info";
      const healthMessage = `💚 Health Check: Uptime ${health.uptimeFormatted}, Memory ${health.memoryUsageFormatted} (${health.memoryUsagePercent.toFixed(1)}%)${health.cpuUsage !== undefined ? `, CPU ${health.cpuUsage.toFixed(1)}%` : ""}`;

      const healthData: Record<string, unknown> = {
        uptime: health.uptimeFormatted,
        memoryUsage: health.memoryUsageFormatted,
        memoryUsagePercent: health.memoryUsagePercent,
        timestamp: new Date(health.timestamp).toISOString(),
      };

      if (health.cpuUsage !== undefined) {
        healthData.cpuUsage = `${health.cpuUsage.toFixed(1)}%`;
      }

      if (health.services) {
        healthData.services = health.services;
      }

      if (logLevel === "debug") {
        this.logger.debug(healthMessage, healthData);
      } else {
        this.logger.info(healthMessage, undefined, healthData);
      }

      // Check thresholds and alert if needed
      if (this.config.alertsEnabled) {
        this.checkThresholds(health);
      }
    } catch (error) {
      this.logger.error(
        "Failed to perform health check",
        undefined,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Check health thresholds and log alerts if exceeded.
   */
  private checkThresholds(health: HealthStatus): void {
    const alertLogLevel = this.config.alertLogLevel || "warn";

    // Check memory threshold
    if (health.memoryUsagePercent >= this.config.memoryThreshold) {
      const message = `⚠️  Memory usage threshold exceeded: ${health.memoryUsagePercent.toFixed(1)}% >= ${this.config.memoryThreshold}%`;
      const alertData = {
        metric: "memory",
        current: `${health.memoryUsagePercent.toFixed(1)}%`,
        threshold: `${this.config.memoryThreshold}%`,
        memoryUsage: health.memoryUsageFormatted,
      };

      if (alertLogLevel === "error") {
        this.logger.error(message, undefined, alertData);
      } else {
        this.logger.warn(message, undefined, alertData);
      }
    }

    // Check CPU threshold
    if (
      health.cpuUsage !== undefined &&
      health.cpuUsage >= this.config.cpuThreshold
    ) {
      const message = `⚠️  CPU usage threshold exceeded: ${health.cpuUsage.toFixed(1)}% >= ${this.config.cpuThreshold}%`;
      const alertData = {
        metric: "cpu",
        current: `${health.cpuUsage.toFixed(1)}%`,
        threshold: `${this.config.cpuThreshold}%`,
      };

      if (alertLogLevel === "error") {
        this.logger.error(message, undefined, alertData);
      } else {
        this.logger.warn(message, undefined, alertData);
      }
    }

    // Check external service statuses
    if (health.services) {
      for (const [name, service] of Object.entries(health.services)) {
        if (service.status === "unhealthy") {
          const message = `⚠️  Service '${name}' is unhealthy: ${service.error || "Unknown error"}`;
          const alertData = {
            service: name,
            status: service.status,
            error: service.error,
            responseTime: service.responseTime,
          };

          if (alertLogLevel === "error") {
            this.logger.error(message, undefined, alertData);
          } else {
            this.logger.warn(message, undefined, alertData);
          }
        } else if (service.status === "degraded") {
          const message = `⚠️  Service '${name}' is degraded${service.responseTime ? ` (response time: ${service.responseTime}ms)` : ""}`;
          const alertData = {
            service: name,
            status: service.status,
            responseTime: service.responseTime,
          };

          this.logger.warn(message, undefined, alertData);
        }
      }
    }
  }

  /**
   * Get current health status (without logging).
   * @returns Current health status
   */
  async getCurrentHealth(): Promise<HealthStatus> {
    return await collectHealthStatus(this.config.serviceChecks);
  }
}

