import { controller, Get } from "@expressots/adapter-express";

@controller("/")
export class AppController {
    @Get("/")
    execute() {
        return "Hello from ExpressoTS!";
    }
}
