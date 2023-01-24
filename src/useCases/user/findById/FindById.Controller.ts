import { controller, httpGet, interfaces, requestParam, response } from "inversify-express-utils";
import { FindByIdUseCase } from "./FindById.UseCase";
import { IFindByIdDTO } from "./IFindById.DTO";
import { ApplicationError } from "@providers/error/ApplicationError";
import { ApplicationErrorCode, HttpStatusErrorCode } from "@providers/error/ErrorTypes";
import Log, { LogLevel } from "@providers/logger/exception/ExceptionLogger.Provider";

@controller("/user")
class FindByIdController implements interfaces.Controller {
    constructor(private findByIdUseCase: FindByIdUseCase) { }

    @httpGet("/find/:id")
    async Execute(@requestParam("id") id: string, @response() res): Promise<IFindByIdDTO> {
        let dataReturn: IFindByIdDTO | ApplicationError;

        try {
            dataReturn = await this.findByIdUseCase.Execute(id);

            if (dataReturn instanceof ApplicationError) {
                return res.status(dataReturn.ErrorType).json({ error: dataReturn.ErrorType, message: dataReturn.Message });
            }

            return res.status(HttpStatusErrorCode.OK).json(dataReturn);
        } catch (error: any) {
            Log(LogLevel.Error, error, "user-find-by-id");
            return res.status(ApplicationErrorCode.GeneralAppError).json({ error: ApplicationErrorCode.GeneralAppError, message: error.message });
        }
    }
}

export { FindByIdController };