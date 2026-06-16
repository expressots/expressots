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
    async execute(
        @body() payload: CreateUserRequestDTO,
        @response() res: Response,
    ): Promise<CreateUserResponseDTO> {
        return this.callUseCase(
            await this.createUserUseCase.execute(payload),
            res,
            StatusCode.Created,
        );
    }
}
