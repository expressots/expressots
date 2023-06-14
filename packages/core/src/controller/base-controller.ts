import { provide } from 'inversify-binding-decorators';
import { interfaces } from 'inversify-express-utils';
import { Report } from '../error';

/**
 * The BaseController class is an abstract base class for controllers.
 * It provides methods for handling use case calls and sending appropriate responses.
 * @provide BaseController
 */
@provide(BaseController)
abstract class BaseController implements interfaces.Controller {

    private serviceName: string;

    /**
     * Constructs a new BaseController instance with a specified service name.
     * @param serviceName - The name of the service associated with the controller.
     */
    constructor(serviceName: string="") {
        this.serviceName = serviceName;
    }

    /**
     * Calls an asynchronous use case and sends an appropriate response based on the result.
     * @param useCase - A promise representing the asynchronous use case to call.
     * @param res - The Express response object.
     * @param successStatusCode - The HTTP status code to return upon successful execution.
     */
    protected async callUseCaseAsync(useCase: Promise<any>, res: any, successStatusCode: number) {

        let dataReturn: any;

        try {
            dataReturn = await useCase;

            return res.status(successStatusCode).json(dataReturn);
        } catch (error: any) {
            Report.Error(error, undefined, this.serviceName);
        }
    }

    /**
     * Calls a use case and sends an appropriate response based on the result.
     * @param useCase - The use case to call.
     * @param res - The Express response object.
     * @param successStatusCode - The HTTP status code to return upon successful execution.
     */
    protected callUseCase(useCase: any, res: any, successStatusCode: number) {

        let dataReturn: any;

        try {
            dataReturn = useCase;

            return res.status(successStatusCode).json(dataReturn);
        } catch (error: any) {
            Report.Error(error, undefined, this.serviceName);
        }
    }

  
}

export { BaseController };