import { BaseController, StatusCode } from "@expressots/core";
import { Get, controller, response } from "@expressots/adapter-express";
import { Response } from "express";
import { FindAllUserResponseDTO } from "./user-findall.dto";
import { FindAllUserUseCase } from "./user-findall.usecase";

@controller("/user/findall")
export class UserFindallController extends BaseController {
    constructor(private findallUserUseCase: FindAllUserUseCase) {
        super();
    }

    @Get("/")
    execute(@response() res: Response): FindAllUserResponseDTO {
        return this.callUseCase(
            this.findallUserUseCase.execute(),
            res,
            StatusCode.OK,
        );
    }
}
