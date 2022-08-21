import { HttpStatusErrorCode } from '@providers/error/ErrorTypes';
import { User } from "@entities/User";
import { ApplicationError } from "@providers/error/ApplicationError";
import { UserRepository } from "@repositories/user/User.Repository";
import { provide } from "inversify-binding-decorators";
import { ICreateJwtDTO, ICreateJwtReturn } from "./ICreateJwt.DTO";
import { IsPasswordMatch } from '@providers/crypto-password-hash-gen/CryptoHashPassword.Provider';
import { JsonWebTokenProvider } from '@providers/jwt/JsonWebToken.Provider';
import { Report } from '@providers/error/ReportError.Provider';

@provide(CreateJwtUseCase)
class CreateJwtUseCase {

    constructor(private userRepository: UserRepository, private jsonWebTokenProvider: JsonWebTokenProvider) { }

    public async Execute(data: ICreateJwtDTO): Promise<ICreateJwtReturn | ApplicationError> {

        const userFound: User = await this.userRepository.FindByEmail(data.email);

        if (!userFound) {
            const error = Report.Error(new ApplicationError(HttpStatusErrorCode.Found, `User not found with email ${data.email}`), true) as ApplicationError;
            return error;
        }

        let dataReturn: ICreateJwtReturn = { token: "" };

        if (IsPasswordMatch(userFound.hashedPassword, data.password)) {
            const token = this.jsonWebTokenProvider.encode({ id: userFound.id, email: userFound.email });

            dataReturn = { token };
        }

        return dataReturn;
    }
}

export { CreateJwtUseCase };