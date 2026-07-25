
import { User, UserDocument } from "@entities/User";
import { AppError } from "@providers/core/error/ApplicationError";
import { StatusCode } from "@providers/core/error/ErrorTypes";
import { Report } from "@providers/core/error/ReportError.Provider";
import { EmailType, MailTrapProvider } from "@providers/email/mailTrap/MailTrap.Provider";
import { UserRepository } from "@repositories/user/User.Repository";
import { provide } from "inversify-binding-decorators";
import { ICreateUserDTO, ICreateUserReturnDTO } from "./ICreateUser.DTO";
import { BcryptHashGenProvider } from "@providers/hashGenerator/bcrypt/BcryptHashGen.Provider";

@provide(CreateUserUseCase)
class CreateUserUseCase {

    constructor(private userRepository: UserRepository,
        private bcryptHashGen?: BcryptHashGenProvider,
        private mailTrapProvider?: MailTrapProvider
    ) { }

    async Execute(data: ICreateUserDTO): Promise<ICreateUserReturnDTO | AppError> {

        const { name, email, password } = data;
        let userReturn: ICreateUserReturnDTO;

        const SEND_MAIL: boolean = false;

        // Verifying if the user already exist
        const userExist: UserDocument | null = await this.userRepository.FindOne({ email });

        if (userExist) {
            const error: AppError = Report.Error(new AppError(
                StatusCode.BadRequest,
                "User already exist!"),
                "user-create");
            return error;
        }

        const userObj: UserDocument = new User({
            name,
            email,
            password
        });

        // Encrypting password
        if (this.bcryptHashGen) {
            const passwordHash: string | AppError = await this.bcryptHashGen.GeneratePasswordHash(password);

            if (passwordHash instanceof AppError) {
                return passwordHash;
            }

            userObj.password = passwordHash;
        }

        const userCreated = await this.userRepository.Create(userObj);

        if (!userCreated) {
            const error: AppError = Report.Error(new AppError(
                StatusCode.InternalServerError,
                "Error to create user!"), "user-create");
            return error;
        }

        if (SEND_MAIL && this.mailTrapProvider) {
            this.mailTrapProvider.SendEmail(EmailType.CreateUser);
        };

        userReturn = {
            id: userObj.id,
            email: userObj.email,
            status: 'User created successfully!'
        };

        return Promise.resolve(userReturn);
    }
}

export { CreateUserUseCase };