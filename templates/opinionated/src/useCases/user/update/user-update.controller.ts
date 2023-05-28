import { BaseController, StatusCode } from "@expressots/core";
import {
    controller,
    httpPatch,
    requestBody,
    requestParam,
    response,
} from "inversify-express-utils";
import { Response } from "express";
import {
    IUserUpdateRequestDTO,
    IUserUpdateResponseDTO,
} from "./user-update.dto";
import { UserUpdateUseCase } from "./user-update.usecase";

@controller("/user/update")
class UserUpdateController extends BaseController {
    constructor(private userUpdateUseCase: UserUpdateUseCase) {
        super("user-update-controller");
    }

    @httpPatch("/:email")
    execute(
        @requestParam("email") email: string,
        @requestBody() payload: IUserUpdateRequestDTO,
        @response() res: Response,
    ): IUserUpdateResponseDTO {
        const data = { ...payload, email };

        return this.callUseCase(
            this.userUpdateUseCase.execute(data),
            res,
            StatusCode.OK,
        );
    }
}

export { UserUpdateController };
