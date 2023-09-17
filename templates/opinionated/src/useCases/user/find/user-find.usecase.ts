import { Report, StatusCode } from "@expressots/core";
import { UserRepository } from "@repositories/user/user.repository";
import { provide } from "inversify-binding-decorators";
import { UserFindRequestDTO, UserFindResponseDTO } from "./user-find.dto";

@provide(UserFindUseCase)
export class UserFindUseCase {
    constructor(
        private userRepository: UserRepository,
        private report: Report,
    ) {}

    execute(payload: UserFindRequestDTO): UserFindResponseDTO | null {
        const userExists = this.userRepository.findByEmail(payload.email);

        if (!userExists) {
            const error = this.report.error(
                "User not found",
                StatusCode.NotFound,
                "user-find-usecase",
            );
            throw error;
        }

        return {
            id: userExists.id,
            name: userExists.name,
            email: userExists.email,
            message: "user found successfully",
        };
    }
}
