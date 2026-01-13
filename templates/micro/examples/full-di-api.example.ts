/**
 * Full DI API Example
 *
 * Demonstrates how to upgrade from the simple micro() API to the full
 * createMicroAPI() with dependency injection container.
 *
 * Use this when you need:
 * - Dependency injection
 * - Middleware pipeline
 * - Route management with prefixes
 * - Provider registration
 *
 * Run with: npm run example:full-di-api
 */

import { createMicroAPI } from "@expressots/adapter-express";

// Create a micro API with DI container
const microAPI = createMicroAPI();

// Set global route prefix (all routes will be prefixed with /api/v1)
microAPI.setGlobalRoutePrefix("/api/v1");

// Access the container for dependency injection
const container = microAPI.Container;

// Register services in the container
// Example: Register a singleton service
class UserRepository {
    private users = [
        { id: "1", name: "Alice", email: "alice@example.com" },
        { id: "2", name: "Bob", email: "bob@example.com" },
    ];

    findAll() {
        return this.users;
    }

    findById(id: string) {
        return this.users.find((u) => u.id === id);
    }

    create(user: { name: string; email: string }) {
        const newUser = { id: String(Date.now()), ...user };
        this.users.push(newUser);
        return newUser;
    }
}

// Register as singleton (same instance throughout app lifecycle)
container.addSingleton(UserRepository);

// Build the web server
const app = microAPI.build();

// Configure middleware
app.Middleware.parse(); // Enable JSON body parsing

// Add custom middleware
app.Middleware.addMiddleware((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Define routes using the Route interface
// Note: Routes are prefixed with /api/v1

app.Route.get("/", (req, res) => {
    res.json({
        message: "Welcome to ExpressoTS Micro API with DI",
        version: "1.0.0",
    });
});

app.Route.get("/users", (req, res) => {
    // Get the repository from the container
    const userRepo = container.get(UserRepository);
    res.json(userRepo.findAll());
});

app.Route.get("/users/:id", (req, res) => {
    const userRepo = container.get(UserRepository);
    const user = userRepo.findById(req.params.id);

    if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
    }

    res.json(user);
});

app.Route.post("/users", (req, res) => {
    const userRepo = container.get(UserRepository);
    const user = userRepo.create(req.body);
    res.status(201).json(user);
});

app.Route.get("/health", (req, res) => {
    res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
    });
});

// Set custom error handler
app.Middleware.setErrorHandler((err, req, res, next) => {
    console.error("Error:", err);
    res.status(500).json({
        error: err.message,
        path: req.path,
    });
});

// Start the server
app.listen(3000, {
    appName: "Full DI API Example",
    appVersion: "1.0.0",
});

/**
 * Feature Comparison: micro() vs createMicroAPI()
 *
 * | Feature                | micro()         | createMicroAPI() |
 * |------------------------|-----------------|------------------|
 * | Simple routing         | ✅              | ✅               |
 * | Auto-response          | ✅              | ❌               |
 * | Middleware             | ✅ (basic)      | ✅ (pipeline)    |
 * | DI Container           | ❌              | ✅               |
 * | Route prefix           | ✅ (config)     | ✅               |
 * | Provider registration  | ❌              | ✅               |
 * | Middleware presets     | ❌              | ✅               |
 *
 * When to upgrade:
 * - Need dependency injection
 * - Need advanced middleware pipeline
 * - Need provider registration (singletons, etc.)
 * - Building a larger microservice
 */
