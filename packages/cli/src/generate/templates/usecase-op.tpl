import { provide } from "inversify-binding-decorators";
import { I{{className}}RequestDTO, I{{className}}ResponseDTO } from "./{{fileName}}.dto";

@provide({{className}}UseCase)
class {{className}}UseCase {

    constructor() {}

    execute(id: string, payload: I{{className}}RequestDTO): I{{className}}ResponseDTO {
        return "your use case";
    }
}

export { {{className}}UseCase };
