import { BaseController } from "@expressots/core";
import { Get, controller } from "@expressots/adapter-express";
import { AppUseCase } from "./app.usecase";

@controller("/")
class AppController extends BaseController {
    constructor(private appUseCase: AppUseCase) {
        super();
    }

    @Get("/")
    execute() {
        return this.appUseCase.execute();
    }
}

export { AppController };
