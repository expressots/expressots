import { controller, Get } from "@expressots/adapter-express";

@controller("/")
export class AppController {
    @Get("/")
    execute(): string {
        return "Hello from ExpressoTS!";
    }
}
