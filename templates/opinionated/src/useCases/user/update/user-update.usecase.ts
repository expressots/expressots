import { UserRepository } from "@repositories/user/user.repository";
import { provide } from "inversify-binding-decorators";
import {
    IUserUpdateRequestDTO,
    IUserUpdateResponseDTO,
} from "./user-update.dto";
import { AppError, Report, StatusCode } from "@expressots/core";
import { User } from "@entities/user.entity";

@provide(UserUpdateUseCase)
class UserUpdateUseCase {
    constructor(private userRepository: UserRepository) {}

    execute(payload: IUserUpdateRequestDTO): IUserUpdateResponseDTO | null {
        const userExists: User | null = this.userRepository.findByEmail(
            payload.email,
        );

        if (!userExists) {
            Report.Error(
                new AppError(
                    StatusCode.BadRequest,
                    "User not found",
                    "user-update-usecase",
                ),
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
