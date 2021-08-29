
import { User } from "@entities/User";
import { MailTrapProvider } from "@providers/mailTrap/MailTrap.Provider";
import { UserRepository } from "@repositories/user/User.Repository";
import { provide } from "inversify-binding-decorators";
import { ICreateUserDTO, ICreateUserReturn } from "./ICreateUser.DTO";

@provide(CreateUserUseCase)
export class CreateUserUseCase {

    constructor(private userRepository: UserRepository, private mailTrapProvider: MailTrapProvider) { }

    async execute(data: ICreateUserDTO) : Promise<ICreateUserReturn> {

        const {name, email, password} = data;
        let userReturn: ICreateUserReturn;
        const SEND_MAIL: boolean = false;

        try {
            // Verifying if the user already exist
            const userExist:ICreateUserDTO = await this.userRepository.findByEmail(email);

            if (userExist) {
                throw new Error('User already exist!');
            }

            const userObj = new User(name, email, password);
            await this.userRepository.create(userObj);

            if (SEND_MAIL) {
                this.mailTrapProvider.sendEmail({
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

            userReturn = { id:userObj.id, email:userObj.email, status: 'User created successfully!'};
            return userReturn;

        } catch (error: any) {
            return error.message;
        }
    }
}