import { BaseController, StatusCode } from "@expressots/core";
import {
  controller,
  httpPost,
  requestBody,
  response,
} from "inversify-express-utils";
import { ILoginUserDTO, ILoginUserResponseDTO } from "./login-user.dto";
import { LoginUserUsecase } from "./login-user.usecase";

@controller("/user/login")
class LoginUserController extends BaseController {
  constructor(private loginUserUseCase: LoginUserUsecase) {
    super("login-user-controller");
  }

  @httpPost("/")
  execute(
    @requestBody() data: ILoginUserDTO,
    @response() res: ILoginUserResponseDTO,
  ): any {
    return this.callUseCaseAsync(
      this.loginUserUseCase.execute(data),
      res,
      StatusCode.OK,
    );
  }
}

export { LoginUserController };
