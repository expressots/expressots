import { BaseController, StatusCode } from "@expressots/core";
import { controller, httpGet, response } from "inversify-express-utils";
import { IFindAllResponseDTO } from "./findall-user.dto";
import { FindAllUserUseCase } from "./findall-user.usecase";

@controller("/user")
class FindAllUserController extends BaseController {
  constructor(private FindAllUserUseCase: FindAllUserUseCase) {
    super("create-user-controller");
  }

  @httpGet("/")
  execute(@response() res: IFindAllResponseDTO[]): any {
    return this.callUseCaseAsync(
      this.FindAllUserUseCase.execute(),
      res,
      StatusCode.OK,
    );
  }
}

export { FindAllUserController };
