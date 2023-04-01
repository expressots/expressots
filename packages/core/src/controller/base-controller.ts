import { provide } from 'inversify-binding-decorators';
import { interfaces } from 'inversify-express-utils';
import { Report, StatusCode } from '../error';

@provide(BaseController)
abstract class BaseController implements interfaces.Controller {

    private serviceName: string;

    constructor(serviceName: string) {
        this.serviceName = serviceName;
    }

    protected async callUseCaseAsync(useCase: Promise<any>, res: any, successStatusCode: number) {

        let dataReturn: any;

        try {
            dataReturn = await useCase;

            return res.status(successStatusCode).json(dataReturn);
        } catch (error: any) {
            Report.Error(error, StatusCode.InternalServerError, this.serviceName);
        }
    }

    protected callUseCase(useCase: any, res: any, successStatusCode: number) {

        let dataReturn: any;

        try {
            dataReturn = useCase;

            return res.status(successStatusCode).json(dataReturn);
        } catch (error: any) {
            Report.Error(error, StatusCode.InternalServerError, this.serviceName);
        }
    }

  
}

export { BaseController };