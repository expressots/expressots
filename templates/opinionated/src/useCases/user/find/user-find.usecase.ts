import { provide } from "inversify-binding-decorators";
import { IUserFindRequestDTO, IUserFindResponseDTO } from "./user-find.dto";
import { UserRepository } from "@repositories/user/user.repository";
import { AppError, Report, StatusCode } from "@expressots/core";

@provide(UserFindUseCase)
class UserFindUseCase {
    constructor(private userRepository: UserRepository) {}

    execute(payload: IUserFindRequestDTO): IUserFindResponseDTO | null {
        const userExists = this.userRepository.findByEmail(payload.email);

        if (!userExists) {
            Report.Error(
                new AppError(
                    StatusCode.BadRequest,
                    "User not found",
                    "user-find-usecase",
                ),
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
