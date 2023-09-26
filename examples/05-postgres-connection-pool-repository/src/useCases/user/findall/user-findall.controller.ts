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
    async execute(@response() res: Response): Promise<FindAllUserResponseDTO> {
        const useCase = await this.findallUserUseCase.execute();
        return this.callUseCase(useCase, res, StatusCode.OK);
    }
}
