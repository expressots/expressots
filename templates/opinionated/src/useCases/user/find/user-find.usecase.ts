import { Report, StatusCode } from "@expressots/core";
import { UserRepository } from "@repositories/user/user.repository";
import { provide } from "inversify-binding-decorators";
import { IUserFindRequestDTO, IUserFindResponseDTO } from "./user-find.dto";

@provide(UserFindUseCase)
class UserFindUseCase {
    constructor(private userRepository: UserRepository) {}

    execute(payload: IUserFindRequestDTO): IUserFindResponseDTO | null {
        const userExists = this.userRepository.findByEmail(payload.email);

        if (!userExists) {
            Report.Error(
                "User not found",
                StatusCode.NotFound,
                "user-find-usecase",
            );
            return null;
        }

        return {
            id: userExists.id,
            name: userExists.name,
            email: userExists.email,
            message: "user found successfully",
        };
    }
}

export { UserFindUseCase };
