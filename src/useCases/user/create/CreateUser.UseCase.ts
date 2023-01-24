
import { User, UserDocument } from "@entities/User";
import { ApplicationError } from "@providers/error/ApplicationError";
import { ApplicationErrorCode, GeneralErrorCode, HttpStatusErrorCode } from "@providers/error/ErrorTypes";
import { Report } from "@providers/error/ReportError.Provider";
import { MailTrapProvider } from "@providers/mailTrap/MailTrap.Provider";
import { UserRepository } from "@repositories/user/User.Repository";
import { provide } from "inversify-binding-decorators";
import { ICreateUserDTO, ICreateUserReturn } from "./ICreateUser.DTO";
import { PasswordEncryptProvider } from "@providers/passwordEncrypt/PasswordEncrypt.Provider";

@provide(CreateUserUseCase)
class CreateUserUseCase {

    constructor(private userRepository: UserRepository,
        private passwordEncryptProvider?: PasswordEncryptProvider,
        private mailTrapProvider?: MailTrapProvider
    ) { }

    async Execute(data: ICreateUserDTO): Promise<ICreateUserReturn | ApplicationError> {

        const { name, email, password } = data;
        let userReturn: ICreateUserReturn;

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
        if (this.passwordEncryptProvider) {
            const passwordHash: string | ApplicationError = await this.passwordEncryptProvider.GeneratePasswordHash(password);

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
            this.mailTrapProvider.SendEmail({
                to: {
                    name: 'User',
                    email: 'mail-1e7b60@inbox.mailtrap.io'
                },
                from: {
                    name: 'Clean Architecture Twitch Team',
                    email: 'clean@architecture.com'
                },
                subject: 'Welcome to the Clean Architecture Design!',
                body: '<h1>Now you understand the principles of clean and Solid Architecture</h1>'
            });

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