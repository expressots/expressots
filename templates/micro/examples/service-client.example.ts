/**
 * Service Client Example
 *
 * Demonstrates how to use ServiceClient for service-to-service communication
 * with automatic retries, timeouts, and circuit breaker integration.
 *
 * Run with: npm run example:service-client
 */

import { micro, ServiceClient } from "@expressots/adapter-express";

const app = micro();

// Create service clients for different microservices
const userService = new ServiceClient({
    name: "user-service",
    baseUrl: "http://localhost:3001",
    timeout: 5000, // 5 second timeout
    retries: 3, // Retry failed requests up to 3 times
    circuitBreaker: {
        failureThreshold: 5,
        timeout: 30000,
    },
    headers: {
        "X-Service-Name": "api-gateway",
    },
});

const orderService = new ServiceClient({
    name: "order-service",
    baseUrl: "http://localhost:4001",
    timeout: 10000, // Longer timeout for order processing
    retries: 2,
    circuitBreaker: true, // Use default circuit breaker config
});

// Disable circuit breaker for analytics (non-critical)
const analyticsService = new ServiceClient({
    name: "analytics-service",
    baseUrl: "http://localhost:5001",
    timeout: 3000,
    retries: 1,
    circuitBreaker: false,
});

// Get user by ID
app.get("/users/:id", async (req) => {
    try {
        interface User {
            id: string;
            name: string;
            email: string;
        }
        const user = await userService.get<User>(`/api/users/${req.params.id}`);
        return user;
    } catch (error) {
        if ((error as Error).message.includes("Circuit breaker is OPEN")) {
            return { error: "User service temporarily unavailable" };
        }
        return { error: (error as Error).message };
    }
});

// Create a new user
app.post("/users", async (req) => {
    try {
        interface User {
            id: string;
            name: string;
            email: string;
        }
        const user = await userService.post<User>("/api/users", req.body);
        return user;
    } catch (error) {
        return { error: (error as Error).message };
    }
});

// Create an order (calls user and order services)
app.post("/orders", async (req) => {
    const { userId, items } = req.body;

    try {
        // First verify user exists
        interface User {
            id: string;
            name: string;
        }
        const user = await userService.get<User>(`/api/users/${userId}`);

        // Then create the order
        interface Order {
            id: string;
            userId: string;
            items: unknown[];
            total: number;
        }
        const order = await orderService.post<Order>("/api/orders", {
            userId,
            items,
        });

        // Fire-and-forget analytics (don't wait, don't fail if it errors)
        analyticsService
            .post("/events", {
                event: "order.created",
                orderId: order.id,
                userId,
                timestamp: new Date().toISOString(),
            })
            .catch(() => {
                // Ignore analytics errors
            });

        return { order, user };
    } catch (error) {
        return { error: (error as Error).message };
    }
});

// Get service health and statistics
app.get("/health", () => {
    return {
        status: "healthy",
        services: {
            user: userService.getStats(),
            order: orderService.getStats(),
            analytics: analyticsService.getStats(),
        },
    };
});

// Demonstrate custom headers per request
app.get("/users/:id/with-auth", async (req) => {
    try {
        interface User {
            id: string;
            name: string;
        }
        const user = await userService.get<User>(`/api/users/${req.params.id}`, {
            headers: {
                Authorization: `Bearer ${req.headers.authorization}`,
                "X-Request-ID": `req-${Date.now()}`,
            },
        });
        return user;
    } catch (error) {
        return { error: (error as Error).message };
    }
});

// Demonstrate query parameters
app.get("/users", async (req) => {
    try {
        interface UserList {
            users: unknown[];
            total: number;
        }
        const result = await userService.call<UserList>("/api/users", {
            params: {
                page: (req.query.page as string) || "1",
                limit: (req.query.limit as string) || "10",
                sort: (req.query.sort as string) || "createdAt",
            },
        });
        return result;
    } catch (error) {
        return { error: (error as Error).message };
    }
});

app.listen(3000, {
    appName: "Service Client Example",
    appVersion: "1.0.0",
});
