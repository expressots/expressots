import { provide } from "inversify-binding-decorators";
import {
    IUserDeleteRequestDTO,
    IUserDeleteResponseDTO,
} from "./user-delete.dto";
import { UserRepository } from "@repositories/user/user.repository";
import { AppError, Report, StatusCode } from "@expressots/core";

@provide(UserDeleteUseCase)
class UserDeleteUseCase {
    constructor(private userRepository: UserRepository) {}

    execute(payload: IUserDeleteRequestDTO): IUserDeleteResponseDTO | null {
        const userExists = this.userRepository.find(payload.id);

        if (userExists) {
            this.userRepository.delete(userExists?.id);
            return {
                name: userExists.name,
                email: userExists.email,
                message: "user deleted successfully",
            };
        }

        Report.Error(
            new AppError(
                StatusCode.BadRequest,
                "User not found",
                "user-delete-usecase",
            ),
        );

        return null;
    }
}

export { UserDeleteUseCase };
