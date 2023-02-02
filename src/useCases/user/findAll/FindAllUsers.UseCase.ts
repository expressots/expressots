import { provide } from "inversify-binding-decorators";
import { IFindAllUsersResponseDTO } from "./FindAllUsers.DTO";
import { AppError } from "@providers/core/error/ApplicationError";
import { UserRepository } from "@repositories/user/User.Repository";
import { UserDocument } from "@entities/User";
import { Report } from "@providers/core/error/ReportError.Provider";
import { StatusCode } from "@providers/core/error/ErrorTypes";


@provide(FindAllUsersUseCase)
class FindAllUsersUseCase {

    constructor(private usersRepository: UserRepository) { }

    async Execute(): Promise<IFindAllUsersResponseDTO[] | AppError> {

        const users: UserDocument[] = await this.usersRepository.FindAll();

        if (users.length === 0) {
            const error: AppError = Report.Error(new AppError(StatusCode.BadRequest,
                "There is no users!"),
                "user-find-all");
            return error;
        }

        const dataReturn: IFindAllUsersResponseDTO[] = users.map((user: UserDocument) => {
            return {
                id: user._id,
                name: user.name,
                email: user.email,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            };
        });

        return Promise.resolve(dataReturn);
    }
}

export { FindAllUsersUseCase };