import { provide } from "inversify-binding-decorators";
import { User } from "../../../entities/user.entity";
import { ICreateUserDTO, ICreateUserResponseDTO } from "./create-user.dto";
import { AppError, Report, StatusCode } from "@expressots/core";

@provide(CreateUserUseCase)
class CreateUserUseCase {

    async execute(data: ICreateUserDTO): Promise<ICreateUserResponseDTO | AppError> {

        const user = new User(data.name, data.email);

        if (!user) {
            const error: AppError = Report.Error(new AppError(StatusCode.BadRequest, "User not created"),
                "user-create-usecase");
            return error;
        }

        const response: ICreateUserResponseDTO = {
            name: user.name,
            email: user.email,
            status: "success"
        }

        return Promise.resolve(response);
    }
}

export { CreateUserUseCase };