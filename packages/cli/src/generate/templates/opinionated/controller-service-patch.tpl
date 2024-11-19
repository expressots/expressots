import { controller, Patch, body } from "@expressots/adapter-express";
import { inject } from "@expressots/core";
import { {{className}}UseCase } from "./{{fileName}}.usecase";
import { I{{className}}RequestDTO } from "./{{fileName}}.dto";

@controller("/{{{route}}}")
export class {{className}}Controller {
    @inject({{className}}UseCase) private {{useCase}}UseCase: {{className}}UseCase;

    @Patch("/")
    execute(@body() payload: I{{className}}RequestDTO) {
        return this.{{useCase}}UseCase.execute(payload);
    }
}
