import { controller, httpGet, response } from "inversify-express-utils";
import { FindAllUsersUseCase } from "./FindAllUsers.UseCase";
import { IFindAllUsersResponseDTO } from "./FindAllUsers.DTO";
import { BaseController } from "@providers/core/controller/Controller.Provider";
import { StatusCode } from "@providers/error/ErrorTypes";

@controller("/users")
class FindAllUsersController extends BaseController {
    constructor(private updateUserUseCase: FindAllUsersUseCase) {
        super("user-find-all-controller");
    }

    @httpGet("/")
    async Execute(@response() res): Promise<IFindAllUsersResponseDTO[]> {

        return this.CallUseCase(this.updateUserUseCase.Execute(), res, StatusCode.OK);
    }
}

export { FindAllUsersController };