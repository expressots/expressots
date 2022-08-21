import { controller, httpPost, interfaces, requestBody, response } from 'inversify-express-utils';
import { ICreateJwtDTO, ICreateJwtReturn } from './ICreateJwt.DTO';
import { CreateJwtUseCase } from './CreateJwt.UseCase';
import { ApplicationError } from '@providers/error/ApplicationError';
import Log from '@providers/logger/exception/ExceptionLogger.Provider';
import { ApplicationErrorCode } from '@providers/error/ErrorTypes';

@controller("/tokens")
export class CreateJwtController implements interfaces.Controller {

  public constructor(private createJwtUseCase: CreateJwtUseCase) { }

  @httpPost("/")
  public async Create(@requestBody() data: ICreateJwtDTO, @response() res): Promise<ICreateJwtReturn> {

    let dataReturn: ICreateJwtReturn | ApplicationError;

    try {
      dataReturn = await this.createJwtUseCase.Execute(data);

      if (dataReturn instanceof ApplicationError) {
        return res.status(dataReturn.ErrorType).send({ error: dataReturn.ErrorType, message: dataReturn.Message });
      }

      return res.status(201).send(dataReturn);

    } catch (error: any) {
      Log(error, "jwt-create");
      return res.status(ApplicationErrorCode.GeneralAppError).send({ error: ApplicationErrorCode.GeneralAppError, message: error.message });
    }
  }
}
   /* @inject(TYPES.JsonWebTokenProvider) private readonly jsonWebTokenService: JsonWebTokenProvider,
private userRepository: UserRepository */