/**
 * Dependency Injection Container Example
 *
 * This example demonstrates how to use the DI container in the
 * ExpressoTS micro template for service registration and resolution.
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

// Repository - Data access layer
class UserRepository {
    private users = [
        { id: "1", name: "John Doe", email: "john@example.com" },
        { id: "2", name: "Jane Smith", email: "jane@example.com" },
        { id: "3", name: "Bob Wilson", email: "bob@example.com" },
    ];

    findAll() {
        return this.users;
    }

    findById(id: string) {
        return this.users.find((u) => u.id === id);
    }

    create(name: string, email: string) {
        const user = {
            id: Date.now().toString(),
            name,
            email,
        };
        this.users.push(user);
        return user;
    }

    delete(id: string) {
        const index = this.users.findIndex((u) => u.id === id);
        if (index !== -1) {
            this.users.splice(index, 1);
            return true;
        }
        return false;
    }
}

// Service - Business logic layer
class UserService {
    constructor(private userRepository: UserRepository) {}

    getAllUsers() {
        return this.userRepository.findAll();
    }

    getUserById(id: string) {
        const user = this.userRepository.findById(id);
        if (!user) {
            throw new Error(`User ${id} not found`);
        }
        return user;
    }

    createUser(name: string, email: string) {
        // Validation
        if (!name || name.length < 2) {
            throw new Error("Name must be at least 2 characters");
        }
        if (!email || !email.includes("@")) {
            throw new Error("Invalid email address");
        }
        return this.userRepository.create(name, email);
    }

    deleteUser(id: string) {
        if (!this.userRepository.delete(id)) {
            throw new Error(`User ${id} not found`);
        }
        return { success: true };
    }
}

// Logger service
class LoggerService {
    private serviceName: string;

    constructor(serviceName: string = "app") {
        this.serviceName = serviceName;
    }

    info(message: string, data?: Record<string, unknown>) {
        console.log(
            JSON.stringify({
                timestamp: new Date().toISOString(),
                level: "info",
                service: this.serviceName,
                message,
                ...data,
            })
        );
    }

    error(message: string, error?: Error) {
        console.error(
            JSON.stringify({
                timestamp: new Date().toISOString(),
                level: "error",
                service: this.serviceName,
                message,
                error: error?.message,
                stack: error?.stack,
            })
        );
    }
}

// ============================================================================
// Create Micro API & Register Services
// ============================================================================

const microAPI = createMicroAPI();

// Register services with different scopes

// Singleton - Same instance for entire app lifetime
// Good for: Database connections, loggers, config
microAPI.Container.addSingleton(UserRepository);
microAPI.Container.addSingleton(LoggerService);

// Transient - New instance every time
// Good for: Stateless services, request handlers
// Note: UserService depends on UserRepository, so we need to manually create it
// In a more complex setup, you'd use inversify's proper binding

// Manual binding for services with dependencies
const userRepo = new UserRepository();
const userService = new UserService(userRepo);
const logger = new LoggerService("user-service");

// Build application
const app = microAPI.build();
app.Middleware.parse();

// ============================================================================
// Routes using DI
// ============================================================================

app.Route.get("/", (req: Request, res: Response) => {
    logger.info("Root endpoint accessed");
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
    logger.info("Listing all users");
    const users = userService.getAllUsers();
    res.json(users);
});

// GET /users/:id - Get user by ID
app.Route.get("/users/:id", (req: Request, res: Response) => {
    const { id } = req.params;
    logger.info("Getting user by ID", { userId: id });

    try {
        const user = userService.getUserById(id);
        res.json(user);
    } catch (error: any) {
        logger.error("User not found", error);
        res.status(404).json({ error: error.message });
    }
});

// POST /users - Create user
app.Route.post("/users", (req: Request, res: Response) => {
    const { name, email } = req.body;
    logger.info("Creating user", { name, email });

    try {
        const user = userService.createUser(name, email);
        logger.info("User created", { userId: user.id });
        res.status(201).json(user);
    } catch (error: any) {
        logger.error("Failed to create user", error);
        res.status(400).json({ error: error.message });
    }
});

// DELETE /users/:id - Delete user
app.Route.delete("/users/:id", (req: Request, res: Response) => {
    const { id } = req.params;
    logger.info("Deleting user", { userId: id });

    try {
        userService.deleteUser(id);
        logger.info("User deleted", { userId: id });
        res.json({ message: `User ${id} deleted` });
    } catch (error: any) {
        logger.error("Failed to delete user", error);
        res.status(404).json({ error: error.message });
    }
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

Services registered:
  - UserRepository (Singleton)
  - UserService (uses UserRepository)
  - LoggerService (Singleton)

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
