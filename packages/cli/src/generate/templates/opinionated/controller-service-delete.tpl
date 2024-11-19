import { controller, Delete, param } from "@expressots/adapter-express";
import { inject } from "@expressots/core";
import { {{className}}UseCase } from "./{{fileName}}.usecase";

@controller("/{{{route}}}")
export class {{className}}Controller {
    @inject({{className}}UseCase) private {{useCase}}UseCase: {{className}}UseCase;

    @Delete("/:id")
    execute(@param("id") id: string) {
        return this.{{useCase}}UseCase.execute(id);
    }
}
