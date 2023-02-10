import { provide } from 'inversify-binding-decorators';
import { interfaces } from 'inversify-express-utils';
import { AppError, Report } from '../error';

@provide(BaseController)
class BaseController implements interfaces.Controller {

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
            Report.Error(error);
        }
    }

    protected callUseCase(useCase: any, res: any, successStatusCode: number) {

        let dataReturn: any;

        try {
            dataReturn = useCase;

            return res.status(successStatusCode).json(dataReturn);
        } catch (error: any) {
            Report.Error(error);
        }
    }

  
}

export { BaseController };
