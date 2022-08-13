import { CreateUserUseCase } from "./CreateUser.UseCase";
import { controller, httpPost, interfaces, requestBody, response } from "inversify-express-utils";
import { ICreateUserDTO, ICreateUserReturn } from "./ICreateUser.DTO";
import { Report } from "@providers/error/ReportError.Provider";
import { HttpStatusErrorCode } from "@providers/error/ErrorTypes";
import { ApplicationError } from "@providers/error/ApplicationError";


@controller('/user/create')
export class CreateUserController implements interfaces.Controller {

    constructor(private createUserUseCase: CreateUserUseCase) { }

    @httpPost('/')
    async execute(@requestBody() data: ICreateUserDTO, @response() res): Promise<ICreateUserReturn> {

        const dataReturn = await this.createUserUseCase.execute(data);

        if (dataReturn) {
            return res.status(201).json(dataReturn);
        }

        const error = Report.Error(new ApplicationError(HttpStatusErrorCode.BadRequest, "User could not be created"), true) as ApplicationError;
        return res.status(error.ErrorType).json({ error: error.ErrorType, message: error.Message });
    }
}