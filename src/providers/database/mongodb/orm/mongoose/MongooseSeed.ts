import Log, { LogLevel } from "@providers/logger/exception/ExceptionLogger.Provider";
import { UserRepository } from "@repositories/user/User.Repository";
import { CreateUserUseCase } from "@useCases/user/create/CreateUser.UseCase";
import { provide } from "inversify-binding-decorators";
import mongoose from "mongoose"
import { SeedData } from "./SeedData";
import { ICreateUserDTO } from "@useCases/user/create/ICreateUser.DTO";
import { PasswordEncryptProvider } from "@providers/passwordEncrypt/PasswordEncrypt.Provider";

@provide(MongoSeedProvider)
class MongoSeedProvider {

    private userRepository: UserRepository;
    private createUserUseCase: CreateUserUseCase;
    private pwdEncryptHash: PasswordEncryptProvider;

    private seedData: typeof SeedData;

    constructor() {
        /* Objects necessary for the use of the Create Use Case */
        this.userRepository = new UserRepository();
        this.pwdEncryptHash = new PasswordEncryptProvider();
        this.createUserUseCase = new CreateUserUseCase(this.userRepository, this.pwdEncryptHash);
        // ================================================

        this.seedData = SeedData;
    }

    private async DropDatabase(): Promise<void> {
        await mongoose.connection.dropDatabase();
    };

    private async SeedDatabase(): Promise<void> {

        // Seed users
        for (let user of this.seedData.users) {
            user = user as ICreateUserDTO;
            await this.createUserUseCase.Execute(user);
        }
    };

    async Execute(): Promise<void> {
        await this.DropDatabase();
        await this.SeedDatabase();
        Log(LogLevel.Info, "Database seeded", "mongo-seed-provider");
    }

};

const MongoSeed = new MongoSeedProvider();

export { MongoSeed };

