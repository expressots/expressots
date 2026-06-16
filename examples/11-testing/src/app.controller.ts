import { controller, Get } from "@expressots/adapter-express";

@controller("/")
export class AppController {
    @Get("/")
    welcome() {
        return {
            message: "ExpressoTS testing example",
            example: "11-testing",
            docs: "https://doc.expresso-ts.com/docs/features/testing",
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
