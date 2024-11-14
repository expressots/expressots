import { controller, Get } from "@expressots/adapter-express";
import { inject } from "@expressots/core";
import { AppUseCase } from "./app.usecase";

@controller("/")
export class AppController {
    @inject(AppUseCase) private appUseCase: AppUseCase;

    @Get("/")
    execute() {
        return this.appUseCase.execute();
    }
}
