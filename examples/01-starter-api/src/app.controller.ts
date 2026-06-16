import { controller, Get } from "@expressots/adapter-express";

@controller("/")
export class AppController {
    @Get("/")
    welcome() {
        return {
            message: "Hello from ExpressoTS v4!",
            example: "01-starter-api",
            docs: "https://doc.expresso-ts.com/docs/core/first-steps",
        };
    }

    @Get("/health")
    health() {
        return {
            status: "ok",
            uptime: process.uptime(),
        };
    }
}
