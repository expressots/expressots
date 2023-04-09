import { BaseController, StatusCode } from "@expressots/core";
import { controller, httpGet, response } from "inversify-express-utils";
import { IFindAllUserResponseDTO } from "./findall-user.dto";
import { CreateUserUseCase } from "./findall-user.usecase";

@controller("/user/findall")
class FindAllUserController extends BaseController {
    constructor(private createUserUseCase: CreateUserUseCase) {
        super("findall-user-controller");
    }

    @httpGet("/")
    execute(@response() res: any): IFindAllUserResponseDTO {
        return this.callUseCase(
            this.createUserUseCase.execute(),
            res,
            StatusCode.OK,
        );
    }
}

export { FindAllUserController };
