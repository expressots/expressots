import { Report, StatusCode } from "@expressots/core";
import { provide } from "inversify-binding-decorators";
import { User } from "../../../entities/user.entity";
import { ICreateUserDTO, ICreateUserResponseDTO } from "./create-user.dto";

@provide(CreateUserUseCase)
class CreateUserUseCase {

    execute(data: ICreateUserDTO): ICreateUserResponseDTO {
        
        try {
            const user = new User(data.name, data.email);
           
            if (!user) {
                Report.Error(StatusCode.BadRequest, "User not created");
            }
           
            const response: ICreateUserResponseDTO = {
                name: user.name,
                email: user.email,
                status: "success"
            }
            
            return response;

        } catch (error: any) {
            
            throw error;
        }
    }
}

export { CreateUserUseCase };

