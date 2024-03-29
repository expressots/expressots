import { BaseController, StatusCode } from "@expressots/core";
import { controller, Get, response } from "@expressots/adapter-express";
import { Response } from "express";
import { {{className}}UseCase } from "./{{fileName}}.usecase";
import { I{{className}}ResponseDTO } from "./{{fileName}}.dto";

@controller("/{{{route}}}")
export class {{className}}Controller extends BaseController {
    constructor(private {{useCase}}UseCase: {{className}}UseCase) {
	    super();
	}

    @Get("/")
    execute(@response() res: Response): I{{className}}ResponseDTO {
        return this.callUseCase(
            this.{{useCase}}UseCase.execute(),
            res,
            StatusCode.OK,
        );
    }
}
