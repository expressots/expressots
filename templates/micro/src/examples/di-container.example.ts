/**
 * Dependency Injection Container Example
 *
 * This example demonstrates how to use the DI container in the
 * ExpressoTS micro template for service registration and resolution.
 *
 * Note: The micro template uses a simplified DI pattern. For full
 * InversifyJS DI with decorators, use the full application template.
 */

import { createMicroAPI } from "@expressots/adapter-express";
import { defineConfig, Env, loadEnvSync } from "@expressots/core";
import { Request, Response } from "express";

// Load environment
loadEnvSync({ files: { development: ".env.local" } });

// Configuration
const config = defineConfig({
    app: {
        name: Env.string("APP_NAME", { default: "DI Container Example" }),
    },
    server: {
        port: Env.number("PORT", { default: 3000 }),
    },
});

// ============================================================================
// Service Definitions
// ============================================================================

// Simple in-memory user storage
const usersStore = [
    { id: "1", name: "John Doe", email: "john@example.com" },
    { id: "2", name: "Jane Smith", email: "jane@example.com" },
    { id: "3", name: "Bob Wilson", email: "bob@example.com" },
];

// User Service - Business logic
class UserService {
    findAll() {
        return usersStore;
    }

    findById(id: string) {
        return usersStore.find((u) => u.id === id);
    }

    create(name: string, email: string) {
        const user = {
            id: Date.now().toString(),
            name,
            email,
        };
        usersStore.push(user);
        return user;
    }

    delete(id: string) {
        const index = usersStore.findIndex((u) => u.id === id);
        if (index !== -1) {
            usersStore.splice(index, 1);
            return true;
        }
        return false;
    }
}

// ============================================================================
// Create Micro API
// ============================================================================

const microAPI = createMicroAPI();

// Create service instance manually for micro template
// In the full template, this would be handled by the DI container
const userService = new UserService();

// Build application
const app = microAPI.build();
app.Middleware.parse();

// Simple logger function
function log(level: string, message: string, data?: Record<string, unknown>) {
    console.log(
        JSON.stringify({
            timestamp: new Date().toISOString(),
            level,
            message,
            ...data,
        })
    );
}

// ============================================================================
// Routes using Service
// ============================================================================

app.Route.get("/", (req: Request, res: Response) => {
    log("info", "Root endpoint accessed");
    res.json({
        name: config.values.app.name,
        message: "DI Container Example",
        endpoints: [
            "GET /users - List all users",
            "GET /users/:id - Get user by ID",
            "POST /users - Create user",
            "DELETE /users/:id - Delete user",
        ],
    });
});

// GET /users - List all users
app.Route.get("/users", (req: Request, res: Response) => {
    log("info", "Listing all users");
    const users = userService.findAll();
    res.json(users);
});

// GET /users/:id - Get user by ID
app.Route.get("/users/:id", (req: Request, res: Response) => {
    const { id } = req.params;
    log("info", "Getting user by ID", { userId: id });

    const user = userService.findById(id);

    if (!user) {
        log("warn", "User not found", { userId: id });
        return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
});

// POST /users - Create user
app.Route.post("/users", (req: Request, res: Response) => {
    const { name, email } = req.body;
    log("info", "Creating user", { name, email });

    if (!name || !email) {
        return res.status(400).json({ error: "name and email required" });
    }

    const user = userService.create(name, email);

    log("info", "User created", { userId: user.id });
    res.status(201).json(user);
});

// DELETE /users/:id - Delete user
app.Route.delete("/users/:id", (req: Request, res: Response) => {
    const { id } = req.params;
    log("info", "Deleting user", { userId: id });

    const deleted = userService.delete(id);

    if (!deleted) {
        log("warn", "User not found for deletion", { userId: id });
        return res.status(404).json({ error: "User not found" });
    }

    log("info", "User deleted", { userId: id });
    res.json({ message: `User ${id} deleted` });
});

// Health check
app.Route.get("/health", (req: Request, res: Response) => {
    res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
    });
});

// ============================================================================
// Start Server
// ============================================================================

const port = config.values.server.port;
app.listen(port);

console.log(`
🚀 DI Container Example running on http://localhost:${port}

Services:
  - UserService (manual instantiation)

Endpoints:
  GET    /          - API info
  GET    /users     - List all users
  GET    /users/:id - Get user by ID
  POST   /users     - Create user (body: { name, email })
  DELETE /users/:id - Delete user
  GET    /health    - Health check

Try:
  curl http://localhost:${port}/users
  curl http://localhost:${port}/users/1
  curl -X POST http://localhost:${port}/users -H "Content-Type: application/json" -d '{"name":"Alice","email":"alice@example.com"}'
`);
