import { BaseController, StatusCode } from "@expressots/core";
import { controller, Post, body, response } from "@expressots/adapter-express";
import { Response } from "express";
import { {{className}}UseCase } from "./{{fileName}}.usecase";
import { I{{className}}RequestDTO, I{{className}}ResponseDTO } from "./{{fileName}}.dto";

@controller("/{{{route}}}")
export class {{className}}Controller extends BaseController {
    constructor(private {{useCase}}UseCase: {{className}}UseCase) {
	    super();
	}

    @Post("/")
    execute(@body() payload: I{{className}}RequestDTO, @response() res: Response): I{{className}}ResponseDTO {
        return this.callUseCase(
            this.{{useCase}}UseCase.execute(payload),
            res,
            StatusCode.Created,
        );
    }
}
