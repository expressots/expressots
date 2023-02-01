import { controller, httpPut, interfaces, requestBody, requestParam, response } from "inversify-express-utils";
import { AppError } from "@providers/error/ApplicationError";
import { ApplicationErrorCode, HttpStatusErrorCode } from "@providers/error/ErrorTypes";
import Log, { LogLevel } from "@providers/logger/exception/ExceptionLogger.Provider";
import { UpdateUserUseCase } from "./UpdateUser.UseCase";
import { IUpdateUserRequestDTO, IUpdateUserResponseDTO } from "./IUpdateUser.DTO";
import { BaseController } from "@providers/controller/Controller.Provider";

@controller("/user")
class UpdateUserController extends BaseController {
    constructor(private updateUserUseCase: UpdateUserUseCase) {
        super("user-update-controller");
    }

    @httpPut("/update/:id")
    async Execute(@requestParam("id") id: string, @requestBody() data: IUpdateUserRequestDTO, @response() res): Promise<IUpdateUserResponseDTO> {

        data.id = id;

        return this.CallUseCase(this.updateUserUseCase.Execute(data), res);
    }
}

export { UpdateUserController };