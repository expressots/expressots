import { controller } from "inversify-express-utils";
import { httpGet, response } from "inversify-express-utils/lib/decorators";

@controller("/")
class DefaultRouterController {

    @httpGet("")
    async execute(@response() res: any) {
        res.send("API Status: ONLINE");
    }
}

export { DefaultRouterController };
