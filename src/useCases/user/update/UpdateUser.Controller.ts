import { controller, httpPut, requestBody, requestParam, response } from "inversify-express-utils";
import { StatusCode } from "@providers/error/ErrorTypes";
import { UpdateUserUseCase } from "./UpdateUser.UseCase";
import { IUpdateUserRequestDTO, IUpdateUserResponseDTO } from "./IUpdateUser.DTO";
import { BaseController } from "@providers/core/controller/Controller.Provider";

@controller("/user")
class UpdateUserController extends BaseController {
    constructor(private updateUserUseCase: UpdateUserUseCase) {
        super("user-update-controller");
    }

    @httpPut("/update/:id")
    async Execute(@requestParam("id") id: string, @requestBody() data: IUpdateUserRequestDTO, @response() res): Promise<IUpdateUserResponseDTO> {

        data.id = id;

        return this.CallUseCase(this.updateUserUseCase.Execute(data), res, StatusCode.OK);
    }
}

export { UpdateUserController };