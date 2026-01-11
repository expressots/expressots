/**
 * Observability Example
 *
 * This example demonstrates how to implement production-ready
 * observability in the ExpressoTS micro template including:
 * - Health checks (K8s ready)
 * - Prometheus metrics
 * - Structured logging
 * - Request tracing
 */

import { createMicroAPI } from "@expressots/adapter-express";
import { defineConfig, Env, loadEnvSync } from "@expressots/core";
import { Request, Response, NextFunction } from "express";

// Load environment
loadEnvSync({ files: { development: ".env.local" } });

// Configuration
const config = defineConfig({
    app: {
        name: Env.string("APP_NAME", { default: "Observability Example" }),
        version: Env.string("APP_VERSION", { default: "1.0.0" }),
    },
    server: {
        port: Env.number("PORT", { default: 3000 }),
    },
});

// ============================================================================
// Observability Providers (Simplified versions - use @expressots/micro-providers in production)
// ============================================================================

// Health Check Provider
class HealthCheckProvider {
    private checks: Map<string, () => Promise<boolean>> = new Map();

    addCheck(name: string, check: () => Promise<boolean>) {
        this.checks.set(name, check);
    }

    async getHealth() {
        const results: Record<string, boolean> = {};
        let allHealthy = true;

        for (const [name, check] of this.checks) {
            try {
                results[name] = await check();
                if (!results[name]) allHealthy = false;
            } catch {
                results[name] = false;
                allHealthy = false;
            }
        }

        return {
            status: allHealthy ? "healthy" : "unhealthy",
            timestamp: new Date().toISOString(),
            checks: results,
            uptime: process.uptime(),
        };
    }
}

// Metrics Provider
class MetricsProvider {
    private counters: Map<string, number> = new Map();
    private gauges: Map<string, number> = new Map();
    private histograms: Map<string, number[]> = new Map();
    private httpRequests: Map<string, number> = new Map();
    private httpDurations: number[] = [];

    incrementCounter(name: string, value: number = 1) {
        this.counters.set(name, (this.counters.get(name) || 0) + value);
    }

    setGauge(name: string, value: number) {
        this.gauges.set(name, value);
    }

    recordHistogram(name: string, value: number) {
        const values = this.histograms.get(name) || [];
        values.push(value);
        // Keep last 1000 values
        if (values.length > 1000) values.shift();
        this.histograms.set(name, values);
    }

    httpMetricsMiddleware() {
        return (req: Request, res: Response, next: NextFunction) => {
            const start = Date.now();

            res.on("finish", () => {
                const duration = Date.now() - start;
                const key = `${req.method}_${res.statusCode}`;
                this.httpRequests.set(key, (this.httpRequests.get(key) || 0) + 1);
                this.httpDurations.push(duration);
                if (this.httpDurations.length > 1000) this.httpDurations.shift();
            });

            next();
        };
    }

    getPrometheusMetrics() {
        const lines: string[] = [];

        // Process metrics
        lines.push(`# HELP process_uptime_seconds Process uptime`);
        lines.push(`# TYPE process_uptime_seconds gauge`);
        lines.push(`process_uptime_seconds ${process.uptime()}`);

        lines.push(`# HELP process_memory_rss_bytes Resident memory size`);
        lines.push(`# TYPE process_memory_rss_bytes gauge`);
        lines.push(`process_memory_rss_bytes ${process.memoryUsage().rss}`);

        lines.push(`# HELP process_memory_heap_used_bytes Heap memory used`);
        lines.push(`# TYPE process_memory_heap_used_bytes gauge`);
        lines.push(`process_memory_heap_used_bytes ${process.memoryUsage().heapUsed}`);

        // HTTP metrics
        lines.push(`# HELP http_requests_total Total HTTP requests`);
        lines.push(`# TYPE http_requests_total counter`);
        for (const [key, value] of this.httpRequests) {
            const [method, status] = key.split("_");
            lines.push(`http_requests_total{method="${method}",status="${status}"} ${value}`);
        }

        // HTTP duration
        if (this.httpDurations.length > 0) {
            const avg = this.httpDurations.reduce((a, b) => a + b, 0) / this.httpDurations.length;
            lines.push(`# HELP http_request_duration_ms HTTP request duration`);
            lines.push(`# TYPE http_request_duration_ms gauge`);
            lines.push(`http_request_duration_ms_avg ${avg.toFixed(2)}`);
        }

        // Custom counters
        for (const [name, value] of this.counters) {
            lines.push(`${name} ${value}`);
        }

        // Custom gauges
        for (const [name, value] of this.gauges) {
            lines.push(`${name} ${value}`);
        }

        return lines.join("\n");
    }
}

// Structured Logger
class StructuredLogger {
    private serviceName: string;

    constructor(serviceName: string) {
        this.serviceName = serviceName;
    }

    private log(level: string, message: string, data?: Record<string, unknown>) {
        console.log(
            JSON.stringify({
                timestamp: new Date().toISOString(),
                level,
                service: this.serviceName,
                message,
                ...data,
            })
        );
    }

    debug(message: string, data?: Record<string, unknown>) {
        this.log("debug", message, data);
    }

    info(message: string, data?: Record<string, unknown>) {
        this.log("info", message, data);
    }

    warn(message: string, data?: Record<string, unknown>) {
        this.log("warn", message, data);
    }

    error(message: string, data?: Record<string, unknown>) {
        this.log("error", message, data);
    }

    requestMiddleware() {
        return (req: Request, res: Response, next: NextFunction) => {
            const start = Date.now();
            const requestId = req.headers["x-request-id"] || Date.now().toString(36);

            res.setHeader("x-request-id", requestId);

            res.on("finish", () => {
                this.info("HTTP Request", {
                    requestId,
                    method: req.method,
                    path: req.path,
                    status: res.statusCode,
                    duration: Date.now() - start,
                    userAgent: req.headers["user-agent"],
                });
            });

            next();
        };
    }
}

// ============================================================================
// Create Micro API with Observability
// ============================================================================

const microAPI = createMicroAPI();

// Create provider instances
const health = new HealthCheckProvider();
const metrics = new MetricsProvider();
const logger = new StructuredLogger(config.values.app.name);

const app = microAPI.build();

// Add observability middleware
app.Middleware.parse();
app.Middleware.add(metrics.httpMetricsMiddleware());
app.Middleware.add(logger.requestMiddleware());

// Register health checks
health.addCheck("memory", async () => {
    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    return used < 500; // Healthy if less than 500MB
});

health.addCheck("uptime", async () => {
    return process.uptime() > 0;
});

// Simulated external service check
health.addCheck("database", async () => {
    // In real app: return await db.ping();
    return true;
});

// ============================================================================
// Observability Endpoints
// ============================================================================

// Health check (general)
app.Route.get("/health", async (req: Request, res: Response) => {
    const result = await health.getHealth();
    res.status(result.status === "healthy" ? 200 : 503).json(result);
});

// Kubernetes readiness probe
app.Route.get("/health/ready", async (req: Request, res: Response) => {
    const result = await health.getHealth();
    res.status(result.status === "healthy" ? 200 : 503).json({
        status: result.status === "healthy" ? "ready" : "not ready",
        timestamp: result.timestamp,
    });
});

// Kubernetes liveness probe
app.Route.get("/health/live", (req: Request, res: Response) => {
    res.json({
        status: "alive",
        timestamp: new Date().toISOString(),
    });
});

// Prometheus metrics endpoint
app.Route.get("/metrics", (req: Request, res: Response) => {
    res.set("Content-Type", "text/plain; version=0.0.4");
    res.send(metrics.getPrometheusMetrics());
});

// ============================================================================
// Application Endpoints
// ============================================================================

app.Route.get("/", (req: Request, res: Response) => {
    logger.info("Root endpoint accessed");
    res.json({
        name: config.values.app.name,
        version: config.values.app.version,
        observability: {
            health: "/health",
            ready: "/health/ready",
            live: "/health/live",
            metrics: "/metrics",
        },
    });
});

// Sample endpoint that tracks metrics
app.Route.get("/api/data", (req: Request, res: Response) => {
    metrics.incrementCounter("api_data_requests_total");
    logger.info("Data endpoint accessed");

    res.json({
        data: [1, 2, 3, 4, 5],
        timestamp: new Date().toISOString(),
    });
});

// Sample endpoint that might fail
app.Route.get("/api/random", (req: Request, res: Response) => {
    metrics.incrementCounter("api_random_requests_total");

    if (Math.random() < 0.1) {
        logger.warn("Random failure triggered");
        res.status(500).json({ error: "Random failure" });
        return;
    }

    res.json({ value: Math.random() });
});

// ============================================================================
// Start Server
// ============================================================================

const port = config.values.server.port;
app.listen(port);

logger.info("Server started", { port });

console.log(`
🚀 Observability Example running on http://localhost:${port}

Observability Endpoints:
  GET /health       - Full health check
  GET /health/ready - K8s readiness probe
  GET /health/live  - K8s liveness probe
  GET /metrics      - Prometheus metrics

Application Endpoints:
  GET /            - API info
  GET /api/data    - Sample data endpoint
  GET /api/random  - Random endpoint (10% failure rate)

Test with:
  curl http://localhost:${port}/health
  curl http://localhost:${port}/metrics
  curl http://localhost:${port}/api/data

Logs output as JSON for ELK/Loki aggregation.
`);
