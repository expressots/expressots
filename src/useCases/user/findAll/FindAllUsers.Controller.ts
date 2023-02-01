import { controller, httpGet, interfaces, response } from "inversify-express-utils";
import { AppError } from "@providers/error/ApplicationError";
import { ApplicationErrorCode, HttpStatusErrorCode } from "@providers/error/ErrorTypes";
import Log, { LogLevel } from "@providers/logger/exception/ExceptionLogger.Provider";
import { FindAllUsersUseCase } from "./FindAllUsers.UseCase";
import { IFindAllUsersResponseDTO } from "./FindAllUsers.DTO";

@controller("/users")
class FindAllUsersController implements interfaces.Controller {
    constructor(private updateUserUseCase: FindAllUsersUseCase) { }

    @httpGet("/")
    async Execute(@response() res): Promise<IFindAllUsersResponseDTO[]> {
        let dataReturn: IFindAllUsersResponseDTO[] | AppError;

        try {
            dataReturn = await this.updateUserUseCase.Execute();

            if (dataReturn instanceof AppError) {
                return res.status(dataReturn.ErrorType).json({ error: dataReturn.ErrorType, message: dataReturn.Message });
            }

            return res.status(HttpStatusErrorCode.OK).json(dataReturn);
        } catch (error: any) {

            Log(LogLevel.Error, error, "user-find-all");

            return res.status(ApplicationErrorCode.GeneralAppError).json({ error: ApplicationErrorCode.GeneralAppError, message: error.message });
        }
    }
}

export { FindAllUsersController };