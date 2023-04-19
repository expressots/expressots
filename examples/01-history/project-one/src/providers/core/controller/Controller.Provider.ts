import { AppError } from "@providers/core/error/ApplicationError";
import { StatusCode } from "@providers/core/error/ErrorTypes";
import Log, { LogLevel } from "@providers/core/logger/exception/ExceptionLogger.Provider";
import { provide } from "inversify-binding-decorators";
import { interfaces } from "inversify-express-utils";

@provide(BaseController)
class BaseController implements interfaces.Controller {
    private serviceName: string;

    constructor(serviceName: string) {
        this.serviceName = serviceName;
    }

    protected async CallUseCase(useCase: Promise<any>, res: any, successStatusCode: number) {
        let dataReturn: any;

        try {
            dataReturn = await useCase;

            if (dataReturn instanceof AppError) {
                return res.status(dataReturn.ErrorType).json({ error: dataReturn.ErrorType, message: dataReturn.Message });
            }

            return res.status(successStatusCode).json(dataReturn);
        } catch (error: any) {
            Log(LogLevel.Error, error, this.serviceName);
            return res.status(StatusCode.GeneralAppError).json({
                error: StatusCode.GeneralAppError, message: error.message
            });
        }
    }
}

export { BaseController };