/**
 * Circuit Breaker States
 */
export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

/**
 * Configuration for CircuitBreaker
 */
export interface CircuitBreakerConfig {
  /** Number of failures before opening the circuit (default: 5) */
  failureThreshold?: number;
  /** Number of successes in half-open state to close circuit (default: 2) */
  successThreshold?: number;
  /** Time in ms before attempting to close an open circuit (default: 60000) */
  timeout?: number;
  /** Monitoring period in ms for failure counting (default: 10000) */
  monitoringPeriod?: number;
}

/**
 * Circuit Breaker Statistics
 */
export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  totalCalls: number;
  lastFailure?: Date;
  lastSuccess?: Date;
  openedAt?: Date;
}

/**
 * CircuitBreaker - Protect against cascading failures in distributed systems.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Requests fail immediately without calling the service
 * - HALF_OPEN: Limited requests pass through to test if service recovered
 *
 * @example
 * ```typescript
 * const circuitBreaker = new CircuitBreaker({
 *     failureThreshold: 5,
 *     timeout: 60000,
 * });
 *
 * app.Route.get("/external-api", async (req, res) => {
 *     try {
 *         const result = await circuitBreaker.execute(async () => {
 *             return await fetch("https://external-api.com/data");
 *         });
 *         res.json(await result.json());
 *     } catch (error) {
 *         if (error.message === "Circuit breaker is OPEN") {
 *             res.status(503).json({ error: "Service temporarily unavailable" });
 *         } else {
 *             res.status(500).json({ error: error.message });
 *         }
 *     }
 * });
 * ```
 */
export class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failures: number = 0;
  private successes: number = 0;
  private totalSuccesses: number = 0;
  private totalCalls: number = 0;
  private lastFailure?: Date;
  private lastSuccess?: Date;
  private openedAt?: Date;
  private recentFailures: Array<Date> = [];
  private config: Required<CircuitBreakerConfig>;

  constructor(config?: CircuitBreakerConfig) {
    this.config = {
      failureThreshold: config?.failureThreshold ?? 5,
      successThreshold: config?.successThreshold ?? 2,
      timeout: config?.timeout ?? 60000,
      monitoringPeriod: config?.monitoringPeriod ?? 10000,
    };
  }

  /**
   * Execute a function with circuit breaker protection
   * @param fn - Function to execute
   * @throws Error if circuit is open
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalCalls++;

    // Check if circuit is open
    if (this.state === "OPEN") {
      // Check if timeout has passed
      if (this.shouldAttemptReset()) {
        this.state = "HALF_OPEN";
        this.successes = 0;
      } else {
        throw new Error("Circuit breaker is OPEN");
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.totalSuccesses,
      totalCalls: this.totalCalls,
      lastFailure: this.lastFailure,
      lastSuccess: this.lastSuccess,
      openedAt: this.openedAt,
    };
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.state = "CLOSED";
    this.failures = 0;
    this.successes = 0;
    this.totalSuccesses = 0;
    this.recentFailures = [];
    this.openedAt = undefined;
  }

  /**
   * Manually open the circuit
   */
  open(): void {
    this.state = "OPEN";
    this.openedAt = new Date();
  }

  /**
   * Handle successful call
   */
  private onSuccess(): void {
    this.totalSuccesses++;
    this.lastSuccess = new Date();

    if (this.state === "HALF_OPEN") {
      this.successes++;
      if (this.successes >= this.config.successThreshold) {
        this.state = "CLOSED";
        this.failures = 0;
        this.recentFailures = [];
        this.openedAt = undefined;
      }
    } else if (this.state === "CLOSED") {
      // Clear old failures outside monitoring period
      this.cleanupRecentFailures();
    }
  }

  /**
   * Handle failed call
   */
  private onFailure(): void {
    this.failures++;
    this.lastFailure = new Date();
    this.recentFailures.push(this.lastFailure);

    if (this.state === "HALF_OPEN") {
      // Any failure in half-open state reopens the circuit
      this.state = "OPEN";
      this.openedAt = new Date();
      this.successes = 0;
    } else if (this.state === "CLOSED") {
      this.cleanupRecentFailures();

      // Check if we've hit the failure threshold
      if (this.recentFailures.length >= this.config.failureThreshold) {
        this.state = "OPEN";
        this.openedAt = new Date();
      }
    }
  }

  /**
   * Check if timeout has passed and we should try to reset
   */
  private shouldAttemptReset(): boolean {
    if (!this.openedAt) return true;
    return Date.now() - this.openedAt.getTime() >= this.config.timeout;
  }

  /**
   * Remove failures outside the monitoring period
   */
  private cleanupRecentFailures(): void {
    const cutoff = Date.now() - this.config.monitoringPeriod;
    this.recentFailures = this.recentFailures.filter((date) => date.getTime() > cutoff);
  }
}
