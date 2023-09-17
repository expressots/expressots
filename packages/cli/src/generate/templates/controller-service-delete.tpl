import { BaseController, StatusCode } from "@expressots/core";
import { controller, {{method}}, param, response } from "@expressots/adapter-express";
import { Response } from "express";
import { {{className}}UseCase } from "./{{fileName}}.usecase";
import { I{{className}}RequestDTO, I{{className}}ResponseDTO } from "./{{fileName}}.dto";

@controller("/{{{route}}}")
export class {{className}}Controller extends BaseController {
    constructor(private {{useCase}}UseCase: {{className}}UseCase) {
	    super();
	}

    @{{method}}("/:id")
    execute(@param("id") id: string, @response() res: Response): I{{className}}ResponseDTO {
        return this.callUseCase(
            this.{{useCase}}UseCase.execute(id),
            res,
            StatusCode.OK,
      );
    }
}
