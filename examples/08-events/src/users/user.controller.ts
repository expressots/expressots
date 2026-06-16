import { controller, Post, body } from "@expressots/adapter-express";
import { inject } from "@expressots/core";
import { UserService } from "./user.service";

interface CreateUserDto {
    email: string;
}

@controller("/users")
export class UserController {
    constructor(@inject(UserService) private readonly users: UserService) {}

    @Post("/")
    async create(@body() dto: CreateUserDto) {
        return this.users.create(dto.email);
    }
}
