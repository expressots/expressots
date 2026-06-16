import { BaseController, StatusCode } from "@expressots/core";
import { controller } from "inversify-express-utils";
import { httpGet, response } from "inversify-express-utils/lib/decorators";
import { PingResponseDTO } from "./ping.dto";
import { PingUseCase } from "./ping.usecase";

@controller("/ping")
class PingController extends BaseController {
  constructor(private pingUseCase: PingUseCase) {
    super("default-router-controller");
  }

  @httpGet("")
  execute(@response() res: any): Promise<PingResponseDTO> {
    const start: Date = new Date();

    return this.callUseCase(
      this.pingUseCase.execute(start),
      res,
      StatusCode.OK,
    );
  }
}

export { PingController };
