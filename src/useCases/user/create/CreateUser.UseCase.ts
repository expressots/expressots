
import { User, UserDocument } from "@entities/User";
import { ApplicationError } from "@providers/error/ApplicationError";
import { ApplicationErrorCode, GeneralErrorCode, HttpStatusErrorCode } from "@providers/error/ErrorTypes";
import { Report } from "@providers/error/ReportError.Provider";
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

    async Execute(data: ICreateUserDTO): Promise<ICreateUserReturnDTO | ApplicationError> {

        const { name, email, password } = data;
        let userReturn: ICreateUserReturnDTO;

        const SEND_MAIL: boolean = false;

        // Verifying if the user already exist
        const userExist: UserDocument | null = await this.userRepository.FindOne({ email });

        if (userExist) {
            const error: ApplicationError = Report.Error(new ApplicationError(HttpStatusErrorCode.BadRequest, "User already exist!"),
                true, "user-create") as ApplicationError;
            return error;
        }

        const userObj: UserDocument = new User({
            name,
            email,
            password
        });

        // Encrypting password
        if (this.bcryptHashGen) {
            const passwordHash: string | ApplicationError = await this.bcryptHashGen.GeneratePasswordHash(password);

            if (passwordHash instanceof ApplicationError) {
                return passwordHash;
            }

            userObj.password = passwordHash;
        }

        const userCreated = await this.userRepository.Create(userObj);

        if (!userCreated) {
            const error: ApplicationError = Report.Error(
                new ApplicationError(
                    HttpStatusErrorCode.InternalServerError,
                    "Error to create user!"),
                true, "user-create") as ApplicationError;
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