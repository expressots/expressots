import { controller, httpGet, interfaces, response } from "inversify-express-utils";

@controller("/")
class RouterController implements interfaces.Controller {

    @httpGet("/")
    public async Execute(@response() res): Promise<void> {
        res.send('Server Status: Online');
    }
}

export { RouterController };