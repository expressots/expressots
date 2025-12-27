/**
 * Metrics Provider Example
 *
 * This example demonstrates providers with metrics capability.
 *
 * @example
 * ```bash
 * # Run this example
 * ts-node examples/metrics-provider.example.ts
 * ```
 */

import {
  IProvider,
  IMetrics,
  ProviderMetrics,
  provideSingleton
} from "../index";

// Example 1: Connection pool provider with metrics
@provideSingleton(ConnectionPoolProvider)
export class ConnectionPoolProvider implements IProvider, IMetrics {
  readonly name = "Connection Pool Provider";
  private pool = {
    activeConnections: 5,
    idleConnections: 10,
    totalConnections: 15
  };
  private stats = {
    totalQueries: 1000,
    failedQueries: 5,
    averageQueryTime: 25
  };

  getMetrics(): ProviderMetrics {
    return {
      "pool.active": this.pool.activeConnections,
      "pool.idle": this.pool.idleConnections,
      "pool.total": this.pool.totalConnections,
      "queries.total": this.stats.totalQueries,
      "queries.failed": this.stats.failedQueries,
      "queries.success.rate": 
        ((this.stats.totalQueries - this.stats.failedQueries) / 
         this.stats.totalQueries * 100).toFixed(2),
      "avg.query.time": this.stats.averageQueryTime
    };
  }
}

// Example 2: Cache provider with metrics
@provideSingleton(CacheProvider)
export class CacheProvider implements IProvider, IMetrics {
  readonly name = "Cache Provider";
  private stats = {
    hits: 950,
    misses: 50,
    size: 1000
  };

  getMetrics(): ProviderMetrics {
    const hitRate = this.stats.hits / (this.stats.hits + this.stats.misses);
    
    return {
      "cache.hits": this.stats.hits,
      "cache.misses": this.stats.misses,
      "cache.size": this.stats.size,
      "cache.hit.rate": (hitRate * 100).toFixed(2),
      "cache.miss.rate": ((1 - hitRate) * 100).toFixed(2)
    };
  }
}

// Example 3: Queue provider with metrics
@provideSingleton(QueueProvider)
export class QueueProvider implements IProvider, IMetrics {
  readonly name = "Queue Provider";
  private queue = {
    pending: 10,
    processing: 5,
    completed: 1000,
    failed: 2
  };

  getMetrics(): ProviderMetrics {
    return {
      "queue.pending": this.queue.pending,
      "queue.processing": this.queue.processing,
      "queue.completed": this.queue.completed,
      "queue.failed": this.queue.failed,
      "queue.total": 
        this.queue.pending + 
        this.queue.processing + 
        this.queue.completed + 
        this.queue.failed,
      "queue.success.rate": 
        (this.queue.completed / 
         (this.queue.completed + this.queue.failed) * 100).toFixed(2)
    };
  }
}

// Example usage
if (require.main === module) {
  console.log("Metrics Provider Examples");
  console.log("========================");
  console.log("\n1. ConnectionPoolProvider - Pool metrics");
  console.log("2. CacheProvider - Cache metrics");
  console.log("3. QueueProvider - Queue metrics");
}

export {
  ConnectionPoolProvider,
  CacheProvider,
  QueueProvider
};

