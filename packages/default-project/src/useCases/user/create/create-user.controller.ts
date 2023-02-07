import { AppError, BaseController, StatusCode } from "@expressots/core";
import { controller, httpGet, httpPost, requestBody, response } from "inversify-express-utils";
import { CreateUserUseCase } from "./create-user.usecase";
import { ICreateUserDTO, ICreateUserResponseDTO } from "./create-user.dto";

@controller("/user/create")
class CreateUserController {

    constructor(private createUserUseCase: CreateUserUseCase) {
        //super("create-user-controller");
    }

    /* @httpPost("/")
    async execute(@requestBody() data: ICreateUserDTO, @response() res: any):
        Promise<ICreateUserResponseDTO> {

        console.log("payload: ", data);
        //return this.callUseCase(this.createUserUseCase.execute(data), res, StatusCode.Created);

        const useCase = this.createUserUseCase.execute(data);
        console.log("usecase: ", useCase);
        if (useCase instanceof AppError) {
            return res.status(useCase.ErrorType).json({ error: useCase.ErrorType, message: useCase.Message });
        }

        return res.status(StatusCode.Created).json(useCase);
    } */

    @httpPost("/")
    async execute(@requestBody() data: any, @response() res: any) {
        console.log("payload: ", data);
        res.status(200).json({ message: "OK" });
    }
}

export { CreateUserController };
