import { User } from "@entities/user.entity";
import { Report, StatusCode } from "@expressots/core";
import { UserRepository } from "@repositories/user/user.repository";
import { provide } from "inversify-binding-decorators";
import { UserUpdateRequestDTO, UserUpdateResponseDTO } from "./user-update.dto";

@provide(UserUpdateUseCase)
export class UserUpdateUseCase {
    constructor(
        private userRepository: UserRepository,
        private report: Report,
    ) {}

    execute(payload: UserUpdateRequestDTO): UserUpdateResponseDTO | null {
        const userExists: User | null = this.userRepository.findByEmail(
            payload.email,
        );

        if (!userExists) {
            const error = this.report.error(
                "User not found",
                StatusCode.NotFound,
                "user-update-usecase",
            );

            throw error;
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
