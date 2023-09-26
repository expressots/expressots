import { Report, StatusCode } from "@expressots/core";
import { UserRepository } from "@repositories/user/user.repository";
import { provide } from "inversify-binding-decorators";
import { UserDeleteRequestDTO, UserDeleteResponseDTO } from "./user-delete.dto";

@provide(UserDeleteUseCase)
export class UserDeleteUseCase {
    constructor(
        private userRepository: UserRepository,
        private report: Report,
    ) {}

    async execute(
        payload: UserDeleteRequestDTO,
    ): Promise<UserDeleteResponseDTO | null> {
        const userExists = await this.userRepository.find(payload.id);

        if (userExists) {
            this.userRepository.delete(userExists?.id);
            return {
                name: userExists.name,
                email: userExists.email,
                message: "user deleted successfully",
            };
        }

        const error = this.report.error(
            "User not found",
            StatusCode.NotFound,
            "user-delete-usecase",
        );

        throw error;
    }
}
