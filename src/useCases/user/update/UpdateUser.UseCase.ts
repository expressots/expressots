
import { UserRepository } from "@repositories/user/User.Repository";
import { provide } from "inversify-binding-decorators";
import { AppError } from "@providers/error/ApplicationError";
import { UserDocument } from "@entities/User";
import { Report } from "@providers/error/ReportError.Provider";
import { HttpStatusErrorCode } from "@providers/error/ErrorTypes";
import { IUpdateUserRequestDTO, IUpdateUserResponseDTO } from "./IUpdateUser.DTO";
import { BcryptHashGenProvider } from "@providers/hashGenerator/bcrypt/BcryptHashGen.Provider";

@provide(UpdateUserUseCase)
class UpdateUserUseCase {
    constructor(private userRepository: UserRepository, private bcryptHasGen: BcryptHashGenProvider) { }

    async Execute(data: IUpdateUserRequestDTO): Promise<IUpdateUserResponseDTO | AppError> {

        const user: UserDocument | null = await this.userRepository.FindById(data.id);

        if (!user) {
            const error: AppError = Report.Error(new AppError(
                HttpStatusErrorCode.BadRequest,
                "User not found!"),
                "user-find-by-id");
            return error;
        }

        // Update the user
        user.name = (data.name != undefined) ? data.name : user.name;
        user.email = (data.email != undefined) ? data.email : user.email;

        // Encrypting password
        if (this.bcryptHasGen && data.password != undefined) {
            const passwordHash: string | AppError = await this.bcryptHasGen.GeneratePasswordHash(data.password);

            if (passwordHash instanceof AppError) {
                return passwordHash;
            }

            user.password = (data.password != undefined) ? passwordHash : user.password;
        }

        const updatedUser: UserDocument | null = await this.userRepository.Update(user);

        if (!updatedUser) {
            const error: AppError = Report.Error(new AppError(HttpStatusErrorCode.BadRequest,
                "User not updated!"),
                "user-update");
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