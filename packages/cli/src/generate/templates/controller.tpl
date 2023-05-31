import { BaseController } from "@expressots/core";
import { controller, {{method}}, response } from "inversify-express-utils";
import { Response } from "express";

@controller("/{{{route}}}")
class {{className}}Controller extends BaseController {

  constructor() {
		super("{{construct}}-controller")
	}

  @{{method}}("/")
  execute(@response() res: Response) {
    return res.send("Hello Expresso TS");
  }
}

export { {{className}}Controller };
