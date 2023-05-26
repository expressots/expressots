import { BaseController, StatusCode } from "@expressots/core";
import { controller, httpGet, response } from "inversify-express-utils";
import { IFindAllUserResponseDTO } from "./user-findall.dto";
import { FindAllUserUseCase } from "./user-findall.usecase";

@controller("/user/findall")
class UserFindallController extends BaseController {
    constructor(private findallUserUseCase: FindAllUserUseCase) {
        super("findall-user-controller");
    }

    @httpGet("/")
    execute(@response() res: any): IFindAllUserResponseDTO {
        return this.callUseCase(
            this.findallUserUseCase.execute(),
            res,
            StatusCode.OK,
        );
    }
}

export { UserFindallController };
