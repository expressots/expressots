import { BaseController, Report, StatusCode } from "@expressots/core";
import { controller, httpPost, requestBody, response } from "inversify-express-utils";
import { ICreateUserDTO, ICreateUserResponseDTO } from "./create-user.dto";
import { CreateUserUseCase } from "./create-user.usecase";
import { User } from "../../../entities/user.entity";

@controller("/user/create")
class CreateUserController extends BaseController{

    constructor(private createUserUseCase: CreateUserUseCase) {
        super("create-user-controller");
    }

    @httpPost("/")
    async execute(@requestBody() data: ICreateUserDTO, @response() res: any): Promise<ICreateUserResponseDTO> {

        const user = new User(data.name, data.email);
        const response: ICreateUserResponseDTO = {
            name: user.name,
            email: user.email,
            status: "success"
        }
        return response;
        /* return this.callUseCase(this.createUserUseCase.execute(
            data), res, StatusCode.Created); */
    }
}

export { CreateUserController };

