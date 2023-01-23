import Log, { LogLevel } from "@providers/logger/exception/ExceptionLogger.Provider";
import { UserRepository } from "@repositories/user/User.Repository";
import { CreateUserUseCase } from "@useCases/user/create/CreateUser.UseCase";
import mongoose from "mongoose"

const DropDatabase = async () => {
    await mongoose.connection.dropDatabase();
};

const SeedDatabase = async () => {
    const userRepository = new UserRepository();
    const createUserUseCase = new CreateUserUseCase(userRepository);
    await createUserUseCase.Execute({
        name: "Admin",
        email: "admin@email.com",
        password: "password",
    });

    Log(LogLevel.Info, "Database seeded", "mongo-seed-provider");
};

const Seed = async () => {
    await DropDatabase();
    await SeedDatabase();
};

export { Seed };