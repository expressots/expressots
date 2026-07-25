import { provide } from "inversify-binding-decorators";
import { UserRepository } from "@repositories/user/user.repository";
import { IFindAllResponseDTO } from "./findall-user.dto";

@provide(FindAllUserUseCase)
class FindAllUserUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(): Promise<IFindAllResponseDTO[] | null> {
    const users = await this.userRepository.findAll();
    return users;
  }
}

export { FindAllUserUseCase };
