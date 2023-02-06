import { provide } from "inversify-binding-decorators";
import { controller } from "inversify-express-utils";
import { httpGet, response } from "inversify-express-utils/lib/decorators";

@provide(DefaultRouterProvider)
@controller("/")
class DefaultRouterProvider {

    @httpGet("")
    async execute(@response() res: any) {
        res.send("API Status: ONLINE");
    }
}

export default DefaultRouterProvider;