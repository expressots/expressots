import { BaseController, StatusCode } from "@expressots/core";
import {
  controller,
  httpGet,
  requestHeaders,
  response,
} from "inversify-express-utils";
import { IGetUserResponseDTO } from "./getuser-user.dto";
import { GetUserUseCase } from "./getuser-user.usecase";
import authMiddleware from "@providers/middlewares/auth";

@controller("/user/info")
class GetUserController extends BaseController {
  constructor(private GetUserUseCase: GetUserUseCase) {
    super("get-user-controller");
  }
  @httpGet("/", authMiddleware)
  execute(
    @response() res: IGetUserResponseDTO[],
    @requestHeaders("decoded") req,
  ): any {
    return this.callUseCaseAsync(
      this.GetUserUseCase.execute(req),
      res,
      StatusCode.OK,
    );
  }
}

export { GetUserController };
