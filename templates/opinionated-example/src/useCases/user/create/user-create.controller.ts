import { BaseController, StatusCode } from "@expressots/core";
import { Post, body, controller, response } from "@expressots/adapter-express";
import { Response } from "express";
import { CreateUserRequestDTO, CreateUserResponseDTO } from "./user-create.dto";
import { CreateUserUseCase } from "./user-create.usecase";

@controller("/user/create")
export class UserCreateController extends BaseController {
    constructor(private createUserUseCase: CreateUserUseCase) {
        super();
    }

    @Post("/")
    execute(
        @body() payload: CreateUserRequestDTO,
        @response() res: Response,
    ): CreateUserResponseDTO {
        return this.callUseCase(
            this.createUserUseCase.execute(payload),
            res,
            StatusCode.Created,
        );
    }
}
