jest.mock("@repositories/user/User.Repository");

import { UserDocument } from "@entities/User";
import { AppError } from "@providers/core/error/ApplicationError";
import { BcryptHashGenProvider } from "@providers/hashGenerator/bcrypt/BcryptHashGen.Provider";
import { UserRepository } from "@repositories/user/User.Repository";
import { CreateUserUseCase } from "@useCases/user/create/CreateUser.UseCase";
import { ICreateUserDTO, ICreateUserReturnDTO } from "@useCases/user/create/ICreateUser.DTO";

/* Instances */
const userRepository: UserRepository = new UserRepository();
const bcryptHash: BcryptHashGenProvider = new BcryptHashGenProvider();

const now = new Date();
const testUserDocument: UserDocument = {
    id: "1",
    name: "Test User",
    email: "testuser@imdexlimited.com",
    password: "testpassword",
    createdAt: now,
    updatedAt: now
} as UserDocument;

afterEach(() => {
    jest.clearAllMocks();
});

describe("User :: Create use case", () => {

    const testUser: ICreateUserDTO = {
        name: testUserDocument.name,
        email: testUserDocument.email,
        password: testUserDocument.password
    };

    const createUserUseCase: CreateUserUseCase = new CreateUserUseCase(userRepository);

    it("Should return an application error if user already exist", async () => {
        jest.spyOn(userRepository, "Create").mockImplementationOnce(() => {
            return Promise.resolve(testUserDocument);
        });

        const response: ICreateUserReturnDTO | AppError = await createUserUseCase.Execute(testUser);

        expect(response).toEqual({
            id: testUserDocument.id,
            email: testUserDocument.email,
            status: "User created successfully!"
        });
    })

});