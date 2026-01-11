/**
 * Event-Driven Microservice Example
 *
 * This example demonstrates how to build an event-driven microservice
 * using the ExpressoTS micro template with EventEmitter.
 */

import { createMicroAPI } from "@expressots/adapter-express";
import { EventEmitter, defineConfig, Env, loadEnvSync } from "@expressots/core";
import { Request, Response } from "express";

// Load environment
loadEnvSync({ files: { development: ".env.local", production: ".env.prod" } });

// Configuration
const config = defineConfig({
    app: {
        name: Env.string("APP_NAME", { default: "Event-Driven Micro" }),
    },
    server: {
        port: Env.number("PORT", { default: 3000 }),
    },
});

// Create micro API with EventEmitter
const microAPI = createMicroAPI();
microAPI.Container.addSingleton(EventEmitter);

const app = microAPI.build();
const events = microAPI.Container.get(EventEmitter);

app.Middleware.parse();

// ============================================================================
// Event Handlers
// ============================================================================

// Order events
events.on("order.created", async (data: { orderId: string; userId: string }) => {
    console.log(`[Event] Order created: ${data.orderId} by user ${data.userId}`);
    // In a real app:
    // - Send confirmation email
    // - Update inventory
    // - Notify warehouse
});

events.on("order.shipped", async (data: { orderId: string; trackingNumber: string }) => {
    console.log(`[Event] Order shipped: ${data.orderId}, tracking: ${data.trackingNumber}`);
    // In a real app:
    // - Send shipping notification
    // - Update order status
});

events.on("order.cancelled", async (data: { orderId: string; reason: string }) => {
    console.log(`[Event] Order cancelled: ${data.orderId}, reason: ${data.reason}`);
    // In a real app:
    // - Process refund
    // - Restore inventory
    // - Send cancellation email
});

// User events
events.on("user.registered", async (data: { userId: string; email: string }) => {
    console.log(`[Event] User registered: ${data.userId} (${data.email})`);
    // In a real app:
    // - Send welcome email
    // - Create default settings
    // - Track analytics
});

// ============================================================================
// Routes
// ============================================================================

app.Route.get("/", (req: Request, res: Response) => {
    res.json({
        name: config.values.app.name,
        message: "Event-Driven Microservice Example",
        events: ["order.created", "order.shipped", "order.cancelled", "user.registered"],
    });
});

// Create order - emits event
app.Route.post("/orders", async (req: Request, res: Response) => {
    const { userId, items, total } = req.body;

    if (!userId || !items) {
        return res.status(400).json({ error: "userId and items required" });
    }

    const order = {
        id: `order_${Date.now()}`,
        userId,
        items,
        total: total || 0,
        status: "created",
        createdAt: new Date().toISOString(),
    };

    // Emit event for async processing
    await events.emit("order.created", {
        orderId: order.id,
        userId: order.userId,
    });

    res.status(201).json(order);
});

// Ship order - emits event
app.Route.post("/orders/:id/ship", async (req: Request, res: Response) => {
    const { id } = req.params;
    const { trackingNumber } = req.body;

    if (!trackingNumber) {
        return res.status(400).json({ error: "trackingNumber required" });
    }

    // Emit event
    await events.emit("order.shipped", {
        orderId: id,
        trackingNumber,
    });

    res.json({
        orderId: id,
        status: "shipped",
        trackingNumber,
    });
});

// Cancel order - emits event
app.Route.post("/orders/:id/cancel", async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body;

    // Emit event
    await events.emit("order.cancelled", {
        orderId: id,
        reason: reason || "No reason provided",
    });

    res.json({
        orderId: id,
        status: "cancelled",
    });
});

// Register user - emits event
app.Route.post("/users", async (req: Request, res: Response) => {
    const { email, name } = req.body;

    if (!email || !name) {
        return res.status(400).json({ error: "email and name required" });
    }

    const user = {
        id: `user_${Date.now()}`,
        email,
        name,
        createdAt: new Date().toISOString(),
    };

    // Emit event
    await events.emit("user.registered", {
        userId: user.id,
        email: user.email,
    });

    res.status(201).json(user);
});

// Event statistics
app.Route.get("/events/stats", (req: Request, res: Response) => {
    res.json({
        registeredEvents: [
            "order.created",
            "order.shipped",
            "order.cancelled",
            "user.registered",
        ],
        timestamp: new Date().toISOString(),
    });
});

// Health check
app.Route.get("/health", (req: Request, res: Response) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Start server
const port = config.values.server.port;
app.listen(port);

console.log(`
🚀 Event-Driven Microservice running on http://localhost:${port}

Endpoints:
  POST /orders          - Create order (emits order.created)
  POST /orders/:id/ship - Ship order (emits order.shipped)
  POST /orders/:id/cancel - Cancel order (emits order.cancelled)
  POST /users           - Register user (emits user.registered)
  GET  /events/stats    - Event statistics
  GET  /health          - Health check
`);
