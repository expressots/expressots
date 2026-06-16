import { provide } from "inversify-binding-decorators";
import { User } from "@entities/user.entity";
import { UserRepository } from "@repositories/user.repository";
import { IFindAllResponseDTO } from "./findall-user.dto";

@provide(CreateUserUseCase)
class CreateUserUseCase {
    constructor(private userRepository: UserRepository) {}

    execute(): IFindAllResponseDTO[] | null {
        return null;
    }
}

export { CreateUserUseCase };
