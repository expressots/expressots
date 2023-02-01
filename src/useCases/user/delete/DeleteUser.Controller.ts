import { controller, httpDelete, interfaces, requestBody, requestParam, response } from 'inversify-express-utils';
import { DeleteUserUseCase } from './DeleteUser.UseCase';
import { IDeleteRequestDTO, IDeleteResponseDTO } from './IDeleteUser.DTO';
import { AppError } from '@providers/error/ApplicationError';
import Log, { LogLevel } from '@providers/logger/exception/ExceptionLogger.Provider';
import { ApplicationErrorCode, HttpStatusErrorCode } from '@providers/error/ErrorTypes';

@controller('/user')
export class DeleteUserController implements interfaces.Controller {

    constructor(private deleteUserUseCase: DeleteUserUseCase) { }

    @httpDelete('/delete/:id')
    async Execute(@requestParam("id") id: string, @response() res): Promise<IDeleteResponseDTO> {
        let dataReturn: IDeleteResponseDTO | AppError;

        try {

            dataReturn = await this.deleteUserUseCase.Execute({ id: id });

            if (dataReturn instanceof AppError) {
                return res.status(dataReturn.ErrorType).json({ error: dataReturn.ErrorType, message: dataReturn.Message });
            }

            return res.status(HttpStatusErrorCode.OK).json(dataReturn);

        } catch (error: any) {
            Log(LogLevel.Error, error, "user-delete-controller");
            return res.status(ApplicationErrorCode.GeneralAppError).json({ error: ApplicationErrorCode.GeneralAppError, message: error.message });
        }
    }
}