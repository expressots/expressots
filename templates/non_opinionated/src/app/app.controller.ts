import { controller, Get } from "@expressots/adapter-express";
import { AppUseCase } from "./app.usecase";

@controller("/")
export class AppController {
    constructor(private appUseCase: AppUseCase) {}

    @Get("/")
    execute() {
        return this.appUseCase.execute();
    }
}
