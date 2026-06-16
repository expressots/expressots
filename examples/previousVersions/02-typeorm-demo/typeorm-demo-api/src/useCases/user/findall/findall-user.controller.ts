import { BaseController, StatusCode } from "@expressots/core";
import { controller, httpGet, response } from "inversify-express-utils";
import { IFindAllResponseDTO } from "./findall-user.dto";
import { CreateUserUseCase } from "./findall-user.usecase";

@controller("/user")
class FindAllUserController extends BaseController {
    constructor(private createUserUseCase: CreateUserUseCase) {
        super("create-user-controller");
    }

    @httpGet("/")
    execute(@response() res: any): IFindAllResponseDTO {
        return this.callUseCase(
            this.createUserUseCase.execute(),
            res,
            StatusCode.OK,
        );
    }
}

export { FindAllUserController };
