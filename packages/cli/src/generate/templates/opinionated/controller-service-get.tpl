import { controller, Get } from "@expressots/adapter-express";
import { inject } from "@expressots/core";
import { {{className}}UseCase } from "./{{fileName}}.usecase";

@controller("/{{{route}}}")
export class {{className}}Controller {
    @inject({{className}}UseCase) private {{useCase}}UseCase: {{className}}UseCase;
	
    @Get("/")
    execute() {
        return this.{{useCase}}UseCase.execute();
    }
}
