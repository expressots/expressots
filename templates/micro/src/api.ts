import { createMicroAPI } from "@expressots/adapter-express";
import { defineConfig, Env, loadEnvSync } from "@expressots/core";
import { Request, Response } from "express";

// Environment configuration
loadEnvSync({ files: { development: ".env.local", production: ".env.prod" } });

// Type-safe configuration
const config = defineConfig({
    app: {
        name: Env.string("APP_NAME", { default: "ExpressoTS Micro" }),
        version: Env.string("APP_VERSION", { default: "1.0.0" }),
    },
    server: {
        port: Env.number("PORT", { default: 3000 }),
    },
});

// Create micro API
const microAPI = createMicroAPI();
const app = microAPI.build();

// Routes
app.Route.get("/", (req: Request, res: Response) => {
    res.json({
        name: config.values.app.name,
        version: config.values.app.version,
        message: "Hello from ExpressoTS Micro API!",
    });
});

app.Route.get("/health", (req: Request, res: Response) => {
    res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
    });
});

// Start server
const port = config.values.server.port;
app.listen(port, () => {
    console.log(`🚀 Micro API running on http://localhost:${port}`);
});
