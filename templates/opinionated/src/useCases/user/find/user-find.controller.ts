import { BaseController, StatusCode } from "@expressots/core";
import { Response } from "express";
import { UserFindRequestDTO, UserFindResponseDTO } from "./user-find.dto";
import { UserFindUseCase } from "./user-find.usecase";
import { Get, controller, param, response } from "@expressots/adapter-express";

@controller("/user/find")
export class UserFindController extends BaseController {
    constructor(private userFindUseCase: UserFindUseCase) {
        super();
    }

    @Get("/:email")
    execute(
        @param() payload: UserFindRequestDTO,
        @response() res: Response,
    ): UserFindResponseDTO {
        return this.callUseCase(
            this.userFindUseCase.execute(payload),
            res,
            StatusCode.OK,
        );
    }
}
