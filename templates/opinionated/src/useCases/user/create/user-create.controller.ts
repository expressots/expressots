import { BaseController, StatusCode } from "@expressots/core";
import {
    controller,
    httpPost,
    requestBody,
    response,
} from "inversify-express-utils";
import { Response } from "express";
import { CreateUserRequestDTO, CreateUserResponseDTO } from "./user-create.dto";
import { CreateUserUseCase } from "./user-create.usecase";

@controller("/user/create")
class UserCreateController extends BaseController {
    constructor(private createUserUseCase: CreateUserUseCase) {
        super("create-user-controller");
    }

    @httpPost("/")
    execute(
        @requestBody() payload: CreateUserRequestDTO,
        @response() res: Response,
    ): CreateUserResponseDTO {
        return this.callUseCase(
            this.createUserUseCase.execute(payload),
            res,
            StatusCode.Created,
        );
    }
}

export { UserCreateController };
