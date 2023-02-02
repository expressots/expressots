import { controller, httpGet, requestParam, response } from "inversify-express-utils";
import { FindByIdUseCase } from "./FindById.UseCase";
import { IFindByIdDTO } from "./IFindById.DTO";
import { BaseController } from "@providers/core/controller/Controller.Provider";
import { StatusCode } from "@providers/error/ErrorTypes";

@controller("/user")
class FindByIdController extends BaseController {
    constructor(private findByIdUseCase: FindByIdUseCase) {
        super("user-find-by-id-controller");
    }

    @httpGet("/find/:id")
    async Execute(@requestParam("id") id: string, @response() res): Promise<IFindByIdDTO> {

        return this.CallUseCase(this.findByIdUseCase.Execute(id), res, StatusCode.OK);
    }
}

export { FindByIdController };