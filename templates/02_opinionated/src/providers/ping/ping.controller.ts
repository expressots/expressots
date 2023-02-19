import { BaseController, Report, StatusCode } from "@expressots/core";
import { controller } from "inversify-express-utils";
import { httpGet, response } from "inversify-express-utils/lib/decorators";
import { PingUseCase } from "./ping.usecase";
import { PingResponseDTO } from "./ping.dto";

@controller("/")
class PingController extends BaseController {
  constructor(private pingUseCase: PingUseCase) {
    super("default-router-controller");
  }

  @httpGet("")
  execute(@response() res: any): Promise<PingResponseDTO> {
    return this.callUseCase(this.pingUseCase.execute(), res, StatusCode.OK);
  }
}

export { PingController };
