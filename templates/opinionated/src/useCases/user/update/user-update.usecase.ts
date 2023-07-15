import { User } from "@entities/user.entity";
import { Report, StatusCode } from "@expressots/core";
import { UserRepository } from "@repositories/user/user.repository";
import { provide } from "inversify-binding-decorators";
import {
    IUserUpdateRequestDTO,
    IUserUpdateResponseDTO,
} from "./user-update.dto";

@provide(UserUpdateUseCase)
class UserUpdateUseCase {
    constructor(private userRepository: UserRepository) {}

    execute(payload: IUserUpdateRequestDTO): IUserUpdateResponseDTO | null {
        const userExists: User | null = this.userRepository.findByEmail(
            payload.email,
        );

        if (!userExists) {
            Report.Error(
                "User not found",
                StatusCode.NotFound,
                "user-update-usecase",
            );

            return null;
        }

        userExists.name = payload.name || userExists.name;

        return {
            id: userExists.id,
            name: userExists.name,
            email: userExists.email,
            message: "user updated successfully",
        };
    }
}

export { UserUpdateUseCase };
