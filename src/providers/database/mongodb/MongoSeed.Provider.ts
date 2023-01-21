import { UserRepository } from "@repositories/user/User.Repository";
import { CreateUserUseCase } from "@useCases/user/create/CreateUser.UseCase";
import mongoose from "mongoose"

const DropDatabase = async () => {
    await mongoose.connection.dropDatabase();
};

const SeedDatabase = async () => {
    const userRepository = new UserRepository();
    const createUserUseCase = new CreateUserUseCase(userRepository);
    await createUserUseCase.execute({
        name: "Admin",
        email: "admin@email.com",
        password: "password",
    });
};

const Seed = async () => {
    await DropDatabase();
    await SeedDatabase();
};

export { Seed };