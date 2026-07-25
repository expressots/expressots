import { body, controller, Put } from "@expressots/adapter-express";
import { inject } from "@expressots/core";
import { {{className}}UseCase } from "./{{fileName}}.usecase";
import { I{{className}}RequestDTO } from "./{{fileName}}.dto";

@controller("/{{{route}}}")
export class {{className}}Controller {
    @inject({{className}}UseCase) private {{useCase}}UseCase: {{className}}UseCase;

    @Put("/")
    execute(@body() payload: I{{className}}RequestDTO) {
        return this.{{useCase}}UseCase.execute(payload);
    }
}
