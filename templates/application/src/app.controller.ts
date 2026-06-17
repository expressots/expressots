import { controller, Get } from "@expressots/adapter-express";

@controller("/")
export class AppController {
    @Get("/")
    welcome() {
        return {
            message: "Hello from ExpressoTS v4!",
            docs: "https://expresso-ts.com/docs/",
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
