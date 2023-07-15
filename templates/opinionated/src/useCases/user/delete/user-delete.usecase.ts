import { Report, StatusCode } from "@expressots/core";
import { UserRepository } from "@repositories/user/user.repository";
import { provide } from "inversify-binding-decorators";
import {
    IUserDeleteRequestDTO,
    IUserDeleteResponseDTO,
} from "./user-delete.dto";

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
            "User not found",
            StatusCode.NotFound,
            "user-delete-usecase",
        );

        return null;
    }
}

export { UserDeleteUseCase };
