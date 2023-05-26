import { BaseController, StatusCode } from "@expressots/core";
import {
    controller,
    httpGet,
    requestParam,
    response,
} from "inversify-express-utils";
import { IUserFindRequestDTO, IUserFindResponseDTO } from "./user-find.dto";
import { UserFindUseCase } from "./user-find.usecase";

@controller("/user/find")
class UserFindController extends BaseController {
    constructor(private userFindUseCase: UserFindUseCase) {
        super("user-find-controller");
    }

    @httpGet("/:email")
    execute(
        @requestParam() payload: IUserFindRequestDTO,
        @response() res: any,
    ): IUserFindResponseDTO {
        return this.callUseCase(
            this.userFindUseCase.execute(payload),
            res,
            StatusCode.OK,
        );
    }
}

export { UserFindController };
