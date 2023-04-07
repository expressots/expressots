import { BaseController, StatusCode } from "@expressots/core";
import { controller, httpGet, response } from "inversify-express-utils";
import { {{className}}UseCase } from "./{{fileName}}.usecase";
import { I{{className}}ResponseDTO } from "./{{fileName}}.dto";

@controller("/{{{route}}}")
class {{className}}Controller extends BaseController {

  constructor(private {{useCase}}UseCase: {{className}}UseCase ) {
		super("{{construct}}-controller")
	}

  @httpGet("/")
  execute(@response() res: any): I{{className}}ResponseDTO {
    return this.callUseCase(
            this.{{useCase}}UseCase.execute(),
            res,
            StatusCode.Ok,
        );
  }
}

export { {{className}}Controller };
