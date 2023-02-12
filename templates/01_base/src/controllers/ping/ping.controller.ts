import { BaseController } from "@expressots/core";
import { controller, httpGet, response } from "inversify-express-utils";
import { PingUseCase } from "./ping.usecase";


@controller("/")
class PingController extends BaseController {

    constructor(private pingUseCase: PingUseCase) {
        super("ping-controller");
    }
    
    @httpGet("/")
    execute(@response() res: any) {
        const result = this.pingUseCase.execute();
        return res.send(result);
    }
}

export { PingController };