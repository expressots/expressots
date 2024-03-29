import { BaseController } from "@expressots/core";
import { controller, httpGet, response } from "inversify-express-utils";
import { Response } from "express";
import { AppUseCase } from "./app.usecase";

@controller("/")
class AppController extends BaseController {
    constructor(private appUseCase: AppUseCase) {
        super("app-controller");
    }

    @httpGet("/")
    async execute(@response() res: Response) {
        return "Hello from ExpressoTS App"; /* res.send(this.appUseCase.execute()); */
    }
}

export { AppController };
