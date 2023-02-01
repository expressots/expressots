import { controller, httpPut, interfaces, requestBody, requestParam, response } from "inversify-express-utils";
import { AppError } from "@providers/error/ApplicationError";
import { ApplicationErrorCode, HttpStatusErrorCode } from "@providers/error/ErrorTypes";
import Log, { LogLevel } from "@providers/logger/exception/ExceptionLogger.Provider";
import { UpdateUserUseCase } from "./UpdateUser.UseCase";
import { IUpdateUserRequestDTO, IUpdateUserResponseDTO } from "./IUpdateUser.DTO";

@controller("/user")
class UpdateUserController implements interfaces.Controller {
    constructor(private updateUserUseCase: UpdateUserUseCase) { }

    @httpPut("/update/:id")
    async Execute(@requestParam("id") id: string, @requestBody() data: IUpdateUserRequestDTO, @response() res): Promise<IUpdateUserResponseDTO> {
        let dataReturn: IUpdateUserResponseDTO | AppError;

        data.id = id;

        try {
            dataReturn = await this.updateUserUseCase.Execute(data);

            if (dataReturn instanceof AppError) {
                return res.status(dataReturn.ErrorType).json({ error: dataReturn.ErrorType, message: dataReturn.Message });
            }

            return res.status(HttpStatusErrorCode.OK).json(dataReturn);
        } catch (error: any) {
            Log(LogLevel.Error, error, "user-update");
            return res.status(ApplicationErrorCode.GeneralAppError).json({ error: ApplicationErrorCode.GeneralAppError, message: error.message });
        }
    }
}

export { UpdateUserController };