import { controller, Get } from "@expressots/adapter-express";

@controller("/")
export class AppController {
    @Get("/")
    welcome() {
        return {
            message: "ExpressoTS events example",
            example: "08-events",
            docs: "https://doc.expresso-ts.com/docs/features/events",
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
