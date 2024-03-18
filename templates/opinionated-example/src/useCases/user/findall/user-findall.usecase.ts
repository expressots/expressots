import { provide } from "inversify-binding-decorators";
import { User } from "@entities/user.entity";
import { UserRepository } from "@repositories/user/user.repository";
import { FindAllUserResponseDTO } from "./user-findall.dto";

@provide(FindAllUserUseCase)
export class FindAllUserUseCase {
    constructor(private userRepository: UserRepository) {}

    execute(): FindAllUserResponseDTO[] | null {
        try {
            const users = this.userRepository.findAll();
            const response: FindAllUserResponseDTO[] = [];

            users.forEach((user: User) => {
                response.push({
                    id: user.id,
                    name: user.name,
                    email: user.email,
                });
            });

            return response;
        } catch (error: any) {
            throw error;
        }
    }
}
