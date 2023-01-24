import { CreateUserUseCase } from "./CreateUser.UseCase";
import { controller, httpPost, interfaces, requestBody, response } from "inversify-express-utils";
import { ICreateUserDTO, ICreateUserReturn } from "./ICreateUser.DTO";
import { ApplicationErrorCode } from "@providers/error/ErrorTypes";
import { ApplicationError } from "@providers/error/ApplicationError";
import Log, { LogLevel } from "@providers/logger/exception/ExceptionLogger.Provider";

@controller('/user/create')
class CreateUserController implements interfaces.Controller {

    constructor(private createUserUseCase: CreateUserUseCase) { }

    @httpPost('/')
    async execute(@requestBody() data: ICreateUserDTO, @response() res): Promise<ICreateUserReturn> {

        let dataReturn: ICreateUserReturn | ApplicationError;

        try {

            dataReturn = await this.createUserUseCase.Execute(data);

            if (dataReturn instanceof ApplicationError) {
                return res.status(dataReturn.ErrorType).json({ error: dataReturn.ErrorType, message: dataReturn.Message });
            }

            return res.status(201).json(dataReturn);

        } catch (error: any) {
            Log(LogLevel.Error, error, "user-create");
            return res.status(ApplicationErrorCode.GeneralAppError).json({ error: ApplicationErrorCode.GeneralAppError, message: error.message });
        }
    }
}

export { CreateUserController };