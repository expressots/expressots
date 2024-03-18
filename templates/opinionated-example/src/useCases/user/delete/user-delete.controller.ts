import { BaseController, StatusCode } from "@expressots/core";
import { Response } from "express";
import { UserDeleteRequestDTO, UserDeleteResponseDTO } from "./user-delete.dto";
import { UserDeleteUseCase } from "./user-delete.usecase";
import {
    Delete,
    controller,
    param,
    response,
} from "@expressots/adapter-express";

@controller("/user/delete")
export class UserDeleteController extends BaseController {
    constructor(private userDeleteUseCase: UserDeleteUseCase) {
        super();
    }

    @Delete("/:id")
    execute(
        @param() payload: UserDeleteRequestDTO,
        @response() res: Response,
    ): UserDeleteResponseDTO {
        return this.callUseCase(
            this.userDeleteUseCase.execute(payload),
            res,
            StatusCode.OK,
        );
    }
}
