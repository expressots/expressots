import { BaseController } from "@expressots/core";
import { controller, httpGet, response } from "inversify-express-utils";

@controller("/{{{route}}}")
class {{className}}Controller extends BaseController {

  constructor() {
		super("{{construct}}-controller")
	}

  @httpGet("/")
  execute(@response() res: any) {
    return res.send("Hello Expresso TS");
  }
}

export { {{className}}Controller };
