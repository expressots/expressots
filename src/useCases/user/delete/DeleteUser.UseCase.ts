import { ApplicationError } from "@providers/error/ApplicationError";
import { IDeleteRequestDTO, IDeleteResponseDTO } from "./IDeleteUser.DTO";
import { UserRepository } from "@repositories/user/User.Repository";
import { Report } from "@providers/error/ReportError.Provider";
import { HttpStatusErrorCode } from "@providers/error/ErrorTypes";
import { provide } from "inversify-binding-decorators";

@provide(DeleteUserUseCase)
class DeleteUserUseCase {

    constructor(private userRepository: UserRepository) { }

    async Execute(data: IDeleteRequestDTO): Promise<IDeleteResponseDTO | ApplicationError> {
        const { id } = data;

        const userExist = await this.userRepository.FindById(id);

        if (!userExist) {
            const error: ApplicationError = Report.Error(new ApplicationError(HttpStatusErrorCode.BadRequest, "User not found"),
                true, "user-delete") as ApplicationError;
            return error;
        }

        const userDeleted = await this.userRepository.Delete(id);

        if (!userDeleted) {
            const error: ApplicationError = Report.Error(new ApplicationError(HttpStatusErrorCode.BadRequest, "User not deleted"),
                true, "user-delete") as ApplicationError;
            return error;
        }

        const userDataReturn: IDeleteResponseDTO = {
            id: userDeleted._id,
            name: userDeleted.name,
            email: userDeleted.email,
            status: "User deleted successfully"
        }

        return Promise.resolve(userDataReturn);
    }
}

export { DeleteUserUseCase };