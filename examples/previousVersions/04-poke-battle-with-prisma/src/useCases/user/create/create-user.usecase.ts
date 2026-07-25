import { AppError, Report, StatusCode } from "@expressots/core";
import { provide } from "inversify-binding-decorators";
import { ICreateUserDTO, ICreateUserResponseDTO } from "./create-user.dto";
import { UserRepository } from "@repositories/user/user.repository";
import { User } from "@entities/user.entity";
import { IUserDTO } from "@repositories/user/user.dto";
import { JWTProvider } from "@providers/encrypt/jwt/jwt.provider";

@provide(CreateUserUseCase)
class CreateUserUseCase {
  constructor(
    private userRepository: UserRepository,
    private jwtProvider: JWTProvider,
  ) {}

  async execute(data: ICreateUserDTO): Promise<ICreateUserResponseDTO | null> {
    try {
      const { name, email, password } = data;

      const findUser = await this.userRepository.findByEmail(email);

      if (findUser) {
        Report.Error(
          new AppError(
            StatusCode.BadRequest,
            "User already exists",
            "create-user-usecase",
          ),
        );
      }

      const user: IUserDTO = await this.userRepository.create(
        new User(name, email, password),
      );

      if (!user) {
        Report.Error(
          new AppError(
            StatusCode.BadRequest,
            "Registry error",
            "create-user-usecase",
          ),
        );
      }

      let response: ICreateUserResponseDTO;

      if (user !== null) {
        const token = this.jwtProvider.generateToken({
          email: user.email,
          name: user.name,
          id: user.id,
        });

        response = {
          token,
          name: user.name,
          email: user.email,
          status: "success",
        };
        return response;
      }

      return null;
    } catch (error: any) {
      throw error;
    }
  }
}

export { CreateUserUseCase };
