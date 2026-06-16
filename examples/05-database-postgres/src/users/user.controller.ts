import { controller, Get, Post, body } from "@expressots/adapter-express";
import { inject } from "@expressots/core";
import { UserRepository } from "./user.repository";

interface CreateUserDto {
    email: string;
    name: string;
}

@controller("/users")
export class UserController {
    constructor(@inject(UserRepository) private readonly users: UserRepository) {}

    @Get("/")
    list() {
        return this.users.list();
    }

    @Post("/")
    create(@body() dto: CreateUserDto) {
        return this.users.create(dto);
    }
}
