import { provide } from "inversify-binding-decorators";
import { IFindAllUsersResponseDTO } from "./FindAllUsers.DTO";
import { ApplicationError } from "@providers/error/ApplicationError";
import { UserRepository } from "@repositories/user/User.Repository";
import { UserDocument } from "@entities/User";
import { Report } from "@providers/error/ReportError.Provider";
import { HttpStatusErrorCode } from "@providers/error/ErrorTypes";


@provide(FindAllUsersUseCase)
class FindAllUsersUseCase {

    constructor(private usersRepository: UserRepository) { }

    async Execute(): Promise<IFindAllUsersResponseDTO[] | ApplicationError> {

        const users: UserDocument[] = await this.usersRepository.FindAll();

        if (users.length === 0) {
            const error: ApplicationError = Report.Error(new ApplicationError(HttpStatusErrorCode.BadRequest, "There is no users!"),
                true, "user-find-all") as ApplicationError;
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