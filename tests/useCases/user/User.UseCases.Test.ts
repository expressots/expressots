jest.mock("@repositories/user/User.Repository");

import { UserDocument } from "@entities/User";
import { UserRepository } from "@repositories/user/User.Repository";
import { CreateUserUseCase } from "@useCases/user/create/CreateUser.UseCase";
import { ICreateUserDTO } from "@useCases/user/create/ICreateUser.DTO";

const now = new Date();
const testUserDocument: UserDocument = {
    id: "1",
    name: "Test User",
    email: "testuser@imdexlimited.com",
    createdAt: now,
    updatedAt: now
} as UserDocument;

describe("User Create Use Case", () => {
    const userCreated: ICreateUserDTO = {
        name: "User Name",
        email: "user@email.com",
        password: "123456"
    };

    const createUserUseCase: CreateUserUseCase = new CreateUserUseCase(
        new UserRepository());

    it("Should create a new user", async () => {
        jest.spyOn(UserRepository.prototype, "Create").mockImplementationOnce(() => {
            return Promise.resolve(testUserDocument);
        });
    });
});

