/**
 * Graduating from `micro()` to the full `application` template
 *
 * The `micro` template ships with the lightweight `micro()` fluent API. Once
 * you start needing real dependency injection, lifecycle hooks, interceptors,
 * guards, events and auto-discovered modules, the right move is to graduate to
 * the `application` template:
 *
 *     expressots new my-app --template application
 *
 * For projects that want a single-file footprint but still need an IoC
 * container, you can use the intermediate `createMicroAPI()` API shown below.
 * This example keeps a single file but wires up:
 *  - a DI container
 *  - a structured Logger
 *  - JSON parsing + a custom logging middleware
 *  - a typed singleton service
 *  - a 404 + error handler
 *
 * Run with: npm run example:full-di-api
 */

import {
    createMicroAPI,
    type ICreateMicroAPI,
} from "@expressots/adapter-express";
import { Logger } from "@expressots/core";

const microAPI: ICreateMicroAPI = createMicroAPI({
    showBanner: true,
});

microAPI.setGlobalRoutePrefix("/api/v1");

const container = microAPI.Container;
const logger = new Logger().withContext("FullDiApi");

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

container.addSingleton(UserRepository);

const app = microAPI.build();

app.Middleware.parse();

app.Middleware.addMiddleware((req, _res, next) => {
    logger.info(`${req.method} ${req.url}`);
    next();
});

app.Route.get("/", (_req, res) => {
    res.json({
        message: "Welcome to ExpressoTS Micro API with DI",
        version: "1.0.0",
    });
});

app.Route.get("/users", (_req, res) => {
    const repo = container.get(UserRepository);
    res.json(repo.findAll());
});

app.Route.get("/users/:id", (req, res) => {
    const repo = container.get(UserRepository);
    const user = repo.findById(req.params.id);

    if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
    }

    res.json(user);
});

app.Route.post("/users", (req, res) => {
    const repo = container.get(UserRepository);
    const user = repo.create(req.body);
    res.status(201).json(user);
});

app.Route.get("/health", (_req, res) => {
    res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
    });
});

app.Middleware.setErrorHandler((err, req, res, _next) => {
    logger.error(`Unhandled error on ${req.method} ${req.path}`, err);
    res.status(500).json({
        error: err.message,
        path: req.path,
    });
});

app.listen(3000, {
    appName: "Full DI API Example",
    appVersion: "1.0.0",
});

/**
 * Choosing the right API:
 *
 * | API                  | When to use                                          |
 * |----------------------|------------------------------------------------------|
 * | micro()              | Single-file APIs, serverless, sub-100ms cold start   |
 * | createMicroAPI()     | Single-file APIs + DI / providers (this example)     |
 * | `application` tpl    | Modules, lifecycle hooks, interceptors, guards,      |
 * |                      | events, auto-discovery, large codebases              |
 *
 * Going further:
 *  - https://expresso-ts.com/docs/guides/micro-api
 *  - https://expresso-ts.com/docs/core/first-steps
 */
