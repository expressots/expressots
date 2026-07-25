import { controller, Get } from "@expressots/adapter-express";

@controller("/")
export class AppController {
    @Get("/health")
    health() {
        return { status: "ok", uptime: process.uptime() };
    }
}
