import { controller, httpGet, response } from "inversify-express-utils";
import { FindAllUsersUseCase } from "./FindAllUsers.UseCase";
import { IFindAllUsersResponseDTO } from "./FindAllUsers.DTO";
import { BaseController } from "@providers/controller/Controller.Provider";

@controller("/users")
class FindAllUsersController extends BaseController {
    constructor(private updateUserUseCase: FindAllUsersUseCase) {
        super("user-find-all-controller");
    }

    @httpGet("/")
    async Execute(@response() res): Promise<IFindAllUsersResponseDTO[]> {

        return this.CallUseCase(this.updateUserUseCase.Execute(), res);
    }
}

export { FindAllUsersController };