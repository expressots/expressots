import { BaseController } from "@expressots/core";
import { controller, httpGet, response } from "inversify-express-utils";

@controller("/")
class AppController extends BaseController {
    constructor() {
        super("app-controller");
    }

    @httpGet("/")
    execute(@response() res: any): string {
        return res.send("Hello from Expresso TS App");
    }
}

export { AppController };
