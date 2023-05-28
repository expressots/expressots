import { BaseController, StatusCode } from "@expressots/core";
import {
    controller,
    httpDelete,
    requestParam,
    response,
} from "inversify-express-utils";
import { Response } from "express";
import {
    IUserDeleteRequestDTO,
    IUserDeleteResponseDTO,
} from "./user-delete.dto";
import { UserDeleteUseCase } from "./user-delete.usecase";

@controller("/user/delete")
class UserDeleteController extends BaseController {
    constructor(private userDeleteUseCase: UserDeleteUseCase) {
        super("user-delete-controller");
    }

    @httpDelete("/:id")
    execute(
        @requestParam() payload: IUserDeleteRequestDTO,
        @response() res: Response,
    ): IUserDeleteResponseDTO {
        return this.callUseCase(
            this.userDeleteUseCase.execute(payload),
            res,
            StatusCode.OK,
        );
    }
}

export { UserDeleteController };
