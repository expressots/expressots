/**
 * Service Discovery Example
 *
 * Demonstrates how to use ServiceDiscovery for registering and discovering
 * microservices with round-robin load balancing.
 *
 * Run with: npm run example:service-discovery
 */

import { micro, ServiceDiscovery, ServiceClient } from "@expressots/adapter-express";

const app = micro();

// Create a service discovery instance (static mode for this example)
const discovery = new ServiceDiscovery({
    type: "static",
    debug: true, // Enable logging for demo
});

// Register some service instances
// In production, services would self-register on startup
discovery.registerService({
    id: "user-service-1",
    name: "user-service",
    host: "localhost",
    port: 3001,
    health: "healthy",
    lastCheck: new Date(),
    metadata: { version: "1.0.0", region: "us-east-1" },
});

discovery.registerService({
    id: "user-service-2",
    name: "user-service",
    host: "localhost",
    port: 3002,
    health: "healthy",
    lastCheck: new Date(),
    metadata: { version: "1.0.0", region: "us-west-1" },
});

discovery.registerService({
    id: "order-service-1",
    name: "order-service",
    host: "localhost",
    port: 4001,
    health: "healthy",
    lastCheck: new Date(),
});

// Get users - demonstrates round-robin load balancing
app.get("/users", async () => {
    const instance = discovery.getService("user-service");

    if (!instance) {
        return { error: "No healthy user-service instances available" };
    }

    // Create client for this instance
    const client = new ServiceClient({
        name: "user-service",
        baseUrl: `http://${instance.host}:${instance.port}`,
        timeout: 5000,
    });

    try {
        // In real scenario, make the actual call
        // const users = await client.get<User[]>("/api/users");
        return {
            message: `Would call user-service at ${instance.host}:${instance.port}`,
            instance: {
                id: instance.id,
                host: instance.host,
                port: instance.port,
            },
        };
    } catch (error) {
        // Mark instance as unhealthy on failure
        discovery.updateHealth(instance.name, instance.id, "unhealthy");
        return { error: (error as Error).message };
    }
});

// List all registered services
app.get("/services", () => {
    const serviceNames = discovery.listServices();
    const services: Record<string, unknown> = {};

    for (const name of serviceNames) {
        services[name] = discovery.getServiceInstances(name, false);
    }

    return { services };
});

// Get service statistics
app.get("/services/stats", () => {
    return { stats: discovery.getStats() };
});

// Register a new service instance (for self-registration)
app.post("/services/register", (req) => {
    const { id, name, host, port, metadata } = req.body;

    discovery.registerService({
        id,
        name,
        host,
        port,
        health: "healthy",
        lastCheck: new Date(),
        metadata,
    });

    return { message: `Registered ${name} (${id})` };
});

// Deregister a service instance
app.delete("/services/:name/:id", (req) => {
    const { name, id } = req.params;
    discovery.deregisterService(name, id);
    return { message: `Deregistered ${name} (${id})` };
});

// Update service health
app.put("/services/:name/:id/health", (req) => {
    const { name, id } = req.params;
    const { health } = req.body;

    const updated = discovery.updateHealth(name, id, health);
    if (updated) {
        return { message: `Updated ${name} (${id}) health to ${health}` };
    }
    return { error: "Service instance not found" };
});

app.listen(3000, {
    appName: "Service Discovery Example",
    appVersion: "1.0.0",
});
