import { CreateUserUseCase } from "./CreateUser.UseCase";
import { controller, httpPost, interfaces, requestBody, response } from "inversify-express-utils";
import { ICreateUserDTO, ICreateUserReturnDTO } from "./ICreateUser.DTO";
import AuthMiddleware from "@providers/middlewares/AuthMiddleware/AuthMiddleware.Provider";
import { BaseController } from "@providers/controller/Controller.Provider";
import { StatusCode } from "@providers/error/ErrorTypes";

@controller('/user/create')
class CreateUserController extends BaseController {

    constructor(private createUserUseCase: CreateUserUseCase) {
        super("user-create-controller");
    }

    @httpPost('/', AuthMiddleware)
    async execute(@requestBody() data: ICreateUserDTO, @response() res): Promise<ICreateUserReturnDTO> {

        return this.CallUseCase(this.createUserUseCase.Execute(data), res, StatusCode.Created);
    }
}

export { CreateUserController };