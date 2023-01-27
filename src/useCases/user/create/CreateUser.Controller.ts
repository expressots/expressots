import { CreateUserUseCase } from "./CreateUser.UseCase";
import { controller, httpPost, interfaces, requestBody, response } from "inversify-express-utils";
import { ICreateUserDTO, ICreateUserReturnDTO } from "./ICreateUser.DTO";
import { ApplicationErrorCode, HttpStatusErrorCode } from "@providers/error/ErrorTypes";
import { ApplicationError } from "@providers/error/ApplicationError";
import Log, { LogLevel } from "@providers/logger/exception/ExceptionLogger.Provider";
import AuthMiddleware from "@providers/middlewares/AuthMiddleware.Provider";

@controller('/user/create')
class CreateUserController implements interfaces.Controller {

    constructor(private createUserUseCase: CreateUserUseCase) { }

    @httpPost('/', AuthMiddleware)
    async execute(@requestBody() data: ICreateUserDTO, @response() res): Promise<ICreateUserReturnDTO> {

        let dataReturn: ICreateUserReturnDTO | ApplicationError;

        try {

            dataReturn = await this.createUserUseCase.Execute(data);

            if (dataReturn instanceof ApplicationError) {
                return res.status(dataReturn.ErrorType).json({ error: dataReturn.ErrorType, message: dataReturn.Message });
            }

            return res.status(HttpStatusErrorCode.Created).json(dataReturn);

        } catch (error: any) {
            Log(LogLevel.Error, error, "user-create");
            return res.status(ApplicationErrorCode.GeneralAppError).json({ error: ApplicationErrorCode.GeneralAppError, message: error.message });
        }
    }
}

export { CreateUserController };