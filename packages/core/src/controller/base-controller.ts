import { provide } from 'inversify-binding-decorators';
import { AppError, StatusCode } from '../error';
import { LogLevel, log } from '../logger';
import { interfaces } from 'inversify-express-utils';

@provide(BaseController)
class BaseController implements interfaces.Controller {

    private serviceName: string;

    constructor(serviceName: string) {
        this.serviceName = serviceName;
    }

    protected async callUseCase(useCase: Promise<any>, res: any, successStatusCode: number) {

        let dataReturn: any;
        console.log("datareturn: ", dataReturn);

        try {
            dataReturn = await useCase;

            if (dataReturn instanceof AppError) {
                return res.status(dataReturn.ErrorType).json({ error: dataReturn.ErrorType, message: dataReturn.Message });
            }

            return res.status(successStatusCode).json(dataReturn);
        } catch (error: any) {
            //log(LogLevel.Error, error, this.serviceName);
            return res.status(StatusCode.GeneralAppError).json({
                error: StatusCode.GeneralAppError, message: error.message
            });
        }
    }
}

export { BaseController };