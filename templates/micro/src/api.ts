import { createMicroAPI } from "@expressots/adapter-express";
import { defineConfig, Env, loadEnvSync } from "@expressots/core";
import { Request, Response } from "express";

// ============================================================================
// Environment Configuration
// ============================================================================

loadEnvSync({
    files: { development: ".env.local", production: ".env.prod" },
});

// ============================================================================
// Type-Safe Configuration
// ============================================================================

const config = defineConfig({
    app: {
        name: Env.string("APP_NAME", { default: "ExpressoTS Micro" }),
        version: Env.string("APP_VERSION", { default: "1.0.0" }),
    },
    server: {
        port: Env.number("PORT", { default: 3000 }),
    },
});

// ============================================================================
// Create Micro API
// ============================================================================

const microAPI = createMicroAPI();

// ============================================================================
// Optional: Register Services in DI Container
// ============================================================================

// Example service registration (uncomment to use):
//
// class UserService {
//     findAll() {
//         return [{ id: 1, name: "John Doe" }];
//     }
//     findById(id: string) {
//         return { id, name: "John Doe", email: "john@example.com" };
//     }
// }
//
// microAPI.Container.addSingleton(UserService);

// ============================================================================
// Build Application
// ============================================================================

const app = microAPI.build();

// ============================================================================
// Middleware Configuration (V4 Unified Methods)
// ============================================================================

// Request parsing (JSON + URL-encoded)
app.Middleware.parse();

// Security (CORS enabled)
app.Middleware.security({ cors: true });

// Error handler
app.Middleware.setErrorHandler({
    showStackTrace: process.env.NODE_ENV === "development",
});

// ============================================================================
// Routes
// ============================================================================

// Root endpoint - Service info
app.Route.get("/", (req: Request, res: Response) => {
    res.json({
        name: config.values.app.name,
        version: config.values.app.version,
        message: "Hello from ExpressoTS Micro API!",
        timestamp: new Date().toISOString(),
    });
});

// Health check - K8s compatible
app.Route.get("/health", (req: Request, res: Response) => {
    res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || "development",
    });
});

// Kubernetes readiness probe
app.Route.get("/health/ready", (req: Request, res: Response) => {
    // Add custom readiness checks here
    // e.g., database connection, external services
    const isReady = true;

    res.status(isReady ? 200 : 503).json({
        status: isReady ? "ready" : "not ready",
        timestamp: new Date().toISOString(),
    });
});

// Kubernetes liveness probe
app.Route.get("/health/live", (req: Request, res: Response) => {
    res.json({
        status: "alive",
        timestamp: new Date().toISOString(),
    });
});

// ============================================================================
// Example Routes (Uncomment to use)
// ============================================================================

// Example: GET /users - Using DI container
// app.Route.get("/users", (req: Request, res: Response) => {
//     const userService = microAPI.Container.get(UserService);
//     const users = userService.findAll();
//     res.json(users);
// });

// Example: GET /users/:id - Route parameters
// app.Route.get("/users/:id", (req: Request, res: Response) => {
//     const userService = microAPI.Container.get(UserService);
//     const user = userService.findById(req.params.id);
//     if (!user) {
//         return res.status(404).json({ error: "User not found" });
//     }
//     res.json(user);
// });

// Example: POST /users - With request body
// app.Route.post("/users", (req: Request, res: Response) => {
//     const { name, email } = req.body;
//     if (!name || !email) {
//         return res.status(400).json({ error: "Name and email required" });
//     }
//     const user = { id: Date.now().toString(), name, email };
//     res.status(201).json(user);
// });

// ============================================================================
// Start Server
// ============================================================================

const port = config.values.server.port;

app.listen(port, {
    appName: config.values.app.name,
    appVersion: config.values.app.version,
});

console.log(`
🚀 ${config.values.app.name} v${config.values.app.version}
   
   Server:  http://localhost:${port}
   Health:  http://localhost:${port}/health
   Ready:   http://localhost:${port}/health/ready
   Live:    http://localhost:${port}/health/live
`);
