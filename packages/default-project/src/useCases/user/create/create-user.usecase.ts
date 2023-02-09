import { AppError, Report, StatusCode } from "@expressots/core";
import { provide } from "inversify-binding-decorators";
import { User } from "../../../entities/user.entity";
import { ICreateUserDTO, ICreateUserResponseDTO } from "./create-user.dto";

@provide(CreateUserUseCase)
class CreateUserUseCase {

    async execute(data: ICreateUserDTO): Promise<ICreateUserResponseDTO> {
        
        try {
            const user = new User(data.name, data.email);
           
            if (user) {
                Report.Error(StatusCode.BadRequest, "User not created");
                console.log("User not created after throw");
            }
           
            const response: ICreateUserResponseDTO = {
                name: user.name,
                email: user.email,
                status: "success"
            }
            console.log("promise is being responded");
            return Promise.resolve(response);
        } catch (error: any) {
            console.log("error from use case catch block: ", error.message);
            throw error;
        }
    }
}

export { CreateUserUseCase };
