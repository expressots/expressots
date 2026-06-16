import { controller, Get } from "@expressots/adapter-express";

@controller("/")
export class AppController {
    @Get("/")
    welcome() {
        return {
            message: "ExpressoTS message queue example",
            example: "09-message-queue",
            redis: process.env.REDIS_URL ? "configured" : "in-memory fallback",
        };
    }

    @Get("/health")
    health() {
        return {
            status: "ok",
            queue: process.env.REDIS_URL ? "redis" : "memory",
            uptime: process.uptime(),
        };
    }
}
