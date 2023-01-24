
import { UserRepository } from "@repositories/user/User.Repository";
import { provide } from "inversify-binding-decorators";
import { ApplicationError } from "@providers/error/ApplicationError";
import { UserDocument } from "@entities/User";
import { Report } from "@providers/error/ReportError.Provider";
import { HttpStatusErrorCode } from "@providers/error/ErrorTypes";
import { IUpdateUserRequestDTO, IUpdateUserResponseDTO } from "./IUpdateUser.DTO";

@provide(UpdateUserUseCase)
class UpdateUserUseCase {
    constructor(private userRepository: UserRepository) { }

    async Execute(data: IUpdateUserRequestDTO): Promise<IUpdateUserResponseDTO | ApplicationError> {

        const user: UserDocument | null = await this.userRepository.FindById(data.id);

        if (!user) {
            const error: ApplicationError = Report.Error(new ApplicationError(HttpStatusErrorCode.BadRequest, "User not found!"),
                true, "user-find-by-id") as ApplicationError;
            return error;
        }

        // Update the user
        user.name = (data.name != undefined) ? data.name : user.name;
        user.email = (data.email != undefined) ? data.email : user.email;
        user.password = (data.password != undefined) ? data.password : user.password;

        const updatedUser: UserDocument | null = await this.userRepository.Update(user);

        if (!updatedUser) {
            const error: ApplicationError = Report.Error(new ApplicationError(HttpStatusErrorCode.BadRequest, "User not updated!"),
                true, "user-update") as ApplicationError;
            return error;
        }

        const dataReturn: IUpdateUserResponseDTO = {
            id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            status: "User updated successfully!",
            createdAt: updatedUser.createdAt,
            updatedAt: updatedUser.updatedAt
        };

        return Promise.resolve(dataReturn);
    }
}

export { UpdateUserUseCase };