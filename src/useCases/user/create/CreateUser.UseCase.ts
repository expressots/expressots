
import { User } from "@entities/User";
import { ApplicationError } from "@providers/error/ApplicationError";
import { HttpStatusErrorCode } from "@providers/error/ErrorTypes";
import { Report } from "@providers/error/ReportError.Provider";
import { MailTrapProvider } from "@providers/mailTrap/MailTrap.Provider";
import { UserRepository } from "@repositories/user/User.Repository";
import { provide } from "inversify-binding-decorators";
import { ICreateUserDTO, ICreateUserReturn } from "./ICreateUser.DTO";

@provide(CreateUserUseCase)
export class CreateUserUseCase {

    constructor(private userRepository: UserRepository, private mailTrapProvider: MailTrapProvider) { }

    async execute(data: ICreateUserDTO): Promise<ICreateUserReturn | ApplicationError> {

        const { name, email, password } = data;
        let userReturn: ICreateUserReturn | null = null;

        const SEND_MAIL: boolean = false;

        // Verifying if the user already exist
        const userExist: ICreateUserDTO = await this.userRepository.FindByEmail(email);

        if (userExist) {
            const error = Report.Error(new ApplicationError(HttpStatusErrorCode.BadRequest, "User already exist!"), true) as ApplicationError;
            return error;
        }

        const userObj = new User(name, email, password);
        const userCreated = await this.userRepository.Create(userObj);

        UserRepository.USERS.push(userCreated); // Temporary solution to test the user repository

        if (SEND_MAIL) {
            this.mailTrapProvider.SendEmail({
                to: {
                    // name,
                    // email
                    name: 'Renato',
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

        userReturn = { id: userObj.id, email: userObj.email, status: 'User created successfully!' };
        return userReturn;
    }
}