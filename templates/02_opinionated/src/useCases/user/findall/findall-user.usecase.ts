import { provide } from "inversify-binding-decorators";
import { User } from "@entities/user.entity";
import { UserRepository } from "@repositories/user/user.repository";
import { IFindAllResponseDTO } from "./findall-user.dto";

@provide(CreateUserUseCase)
class CreateUserUseCase {
  constructor(private userRepository: UserRepository) {}

  execute(): IFindAllResponseDTO[] | null {
    try {
      const users = this.userRepository.findAll();
      const response: IFindAllResponseDTO[] = [];

      users.forEach((user: User) => {
        response.push({
          id: user.Id,
          name: user.name,
          email: user.email,
        });
      });

      return response;
    } catch (error: any) {
      throw error;
    }
  }
}

export { CreateUserUseCase };
