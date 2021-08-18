import { CreateUserUseCase} from "./CreateUser.UseCase";
import { controller, httpPost, interfaces, requestBody, response } from "inversify-express-utils";
import { ICreateUserDTO, ICreateUserReturn } from "./ICreateUser.DTO";


@controller('/user/create')
export class CreateUserController implements interfaces.Controller {

    constructor(private createUserUseCase: CreateUserUseCase) { }

    @httpPost('/')
    async execute(@requestBody() data: ICreateUserDTO, @response() res): Promise<ICreateUserReturn> {
        try {
            const dataReturn = await this.createUserUseCase.execute(data);
            return res.status(201).json(dataReturn);
        } catch (error: any) {
            throw new Error(error);(error || 'Internal server error!');
        }
    }
}