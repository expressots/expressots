/**
 * Circuit Breaker Example
 *
 * Demonstrates how to use the CircuitBreaker pattern to protect your
 * microservice from cascading failures when calling external services.
 *
 * Run with: npm run example:circuit-breaker
 */

import { micro, CircuitBreaker } from "@expressots/adapter-express";

const app = micro();

// Create a circuit breaker for external API calls
const externalApiBreaker = new CircuitBreaker({
    // Open circuit after 5 failures
    failureThreshold: 5,
    // Try to close circuit after 2 successes in half-open state
    successThreshold: 2,
    // Wait 30 seconds before trying to close an open circuit
    timeout: 30000,
    // Count failures within 10 second window
    monitoringPeriod: 10000,
});

// Simulated external API call (replace with real API)
async function callExternalApi(): Promise<{ data: string }> {
    // Simulate random failures for demo
    if (Math.random() < 0.3) {
        throw new Error("External API unavailable");
    }
    return { data: "Success from external API" };
}

// Protected endpoint using circuit breaker
app.get("/api/external", async () => {
    try {
        const result = await externalApiBreaker.execute(async () => {
            return await callExternalApi();
        });
        return result;
    } catch (error) {
        if (error instanceof Error && error.message === "Circuit breaker is OPEN") {
            // Service is temporarily unavailable
            return {
                error: "Service temporarily unavailable",
                message: "Please try again later",
                retryAfter: 30,
            };
        }
        return { error: (error as Error).message };
    }
});

// Health check with circuit breaker status
app.get("/health", () => {
    const stats = externalApiBreaker.getStats();
    return {
        status: "healthy",
        circuitBreaker: {
            state: stats.state,
            failures: stats.failures,
            successes: stats.successes,
            totalCalls: stats.totalCalls,
            lastFailure: stats.lastFailure,
            lastSuccess: stats.lastSuccess,
        },
    };
});

// Endpoint to manually reset the circuit breaker (for testing)
app.post("/admin/reset-circuit", () => {
    externalApiBreaker.reset();
    return { message: "Circuit breaker reset" };
});

// Endpoint to manually open the circuit (for maintenance)
app.post("/admin/open-circuit", () => {
    externalApiBreaker.open();
    return { message: "Circuit breaker opened" };
});

app.listen(3000, {
    appName: "Circuit Breaker Example",
    appVersion: "1.0.0",
});
