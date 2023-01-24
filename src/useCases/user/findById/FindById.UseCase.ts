import { UserRepository } from "@repositories/user/User.Repository";
import { provide } from "inversify-binding-decorators";
import { IFindByIdDTO } from "./IFindById.DTO";
import { ApplicationError } from "@providers/error/ApplicationError";
import { UserDocument } from "@entities/User";
import { Report } from "@providers/error/ReportError.Provider";
import { HttpStatusErrorCode } from "@providers/error/ErrorTypes";

@provide(FindByIdUseCase)
class FindByIdUseCase {
    constructor(private userRepository: UserRepository) { }

    async Execute(id: string): Promise<IFindByIdDTO | ApplicationError> {

        const user: UserDocument | null = await this.userRepository.FindById(id);

        if (!user) {
            const error: ApplicationError = Report.Error(new ApplicationError(HttpStatusErrorCode.BadRequest, "User not found!"),
                true, "user-find-by-id") as ApplicationError;
            return error;
        }

        const dataReturn: IFindByIdDTO = {
            id: user._id,
            name: user.name,
            email: user.email
        };

        return Promise.resolve(dataReturn);
    }
}

export { FindByIdUseCase };