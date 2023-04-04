import { BaseController, StatusCode } from "@expressots/core";
import { controller } from "inversify-express-utils";
import { httpGet, response } from "inversify-express-utils/lib/decorators";
import { PingUseCase } from "./ping.usecase";
import { PingResponseDTO } from "./ping.dto";

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
