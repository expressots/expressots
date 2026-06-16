import { controller, Post, body } from "@expressots/adapter-express";
import { inject } from "@expressots/core";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
import { UserRepository } from "../users/user.repository";

interface Credentials {
    email: string;
    password: string;
}

@controller("/auth")
export class AuthController {
    private readonly secret = process.env.JWT_SECRET ?? "dev-secret-change-me-min-32-chars-long";

    constructor(@inject(UserRepository) private readonly users: UserRepository) {}

    @Post("/login")
    async login(@body() dto: Credentials) {
        const user = await this.users.findByEmail(dto.email);
        if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
            return { error: "Invalid credentials" };
        }

        const accessToken = jwt.sign(
            {
                id: user.id,
                email: user.email,
                roles: user.roles,
                permissions: user.permissions,
            },
            this.secret,
            { expiresIn: "15m" },
        );

        return { accessToken };
    }
}
