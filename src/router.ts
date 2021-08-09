import { controller, httpGet, interfaces, response } from "inversify-express-utils";

@controller("/")
export class RouterController implements interfaces.Controller {

    @httpGet("/")
    public async execute(@response() res): Promise<void> {
        res.send('Server Status: Online');
    }
}