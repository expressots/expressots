import { BaseController, StatusCode } from "@expressots/core";
import { controller, httpGet, response } from "inversify-express-utils";
import { Response } from "express";
import { AppUseCase } from "./app.usecase";

@controller("/")
class AppController extends BaseController {
    constructor(private appUseCase: AppUseCase) {
        super("app-controller");
    }

    @httpGet("/")
    execute(@response() res: Response): string {
        return this.callUseCase(this.appUseCase.execute(), res, StatusCode.OK);
    }
}

export { AppController };
