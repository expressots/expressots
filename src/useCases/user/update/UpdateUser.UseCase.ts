
import { UserRepository } from "@repositories/user/User.Repository";
import { provide } from "inversify-binding-decorators";
import { ApplicationError } from "@providers/error/ApplicationError";
import { UserDocument } from "@entities/User";
import { Report } from "@providers/error/ReportError.Provider";
import { HttpStatusErrorCode } from "@providers/error/ErrorTypes";
import { IUpdateUserRequestDTO, IUpdateUserResponseDTO } from "./IUpdateUser.DTO";
import { PasswordEncryptProvider } from "@providers/passwordEncrypt/PasswordEncrypt.Provider";

@provide(UpdateUserUseCase)
class UpdateUserUseCase {
    constructor(private userRepository: UserRepository, private passwordEncryptProvider: PasswordEncryptProvider) { }

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

        // Encrypting password
        if (this.passwordEncryptProvider && data.password != undefined) {
            const passwordHash: string | ApplicationError = await this.passwordEncryptProvider.GeneratePasswordHash(data.password);

            if (passwordHash instanceof ApplicationError) {
                return passwordHash;
            }

            user.password = (data.password != undefined) ? passwordHash : user.password;
        }

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
            createdAt: updatedUser.createdAt,
            updatedAt: updatedUser.updatedAt,
            status: "User updated successfully!"
        };

        return Promise.resolve(dataReturn);
    }
}

export { UpdateUserUseCase };