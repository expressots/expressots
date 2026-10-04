import { controller, Post, body } from "@expressots/adapter-express";
import { inject, AppError } from "@expressots/core";
import { JwtProvider } from "@expressots/jwt";
import * as bcrypt from "bcryptjs";
import { UserRepository } from "../users/user.repository";
interface Credentials {
    email: string;
    password: string;
}
@controller("/auth")
export class AuthController {
    constructor(
        @inject(UserRepository) private readonly users: UserRepository,
        @inject(JwtProvider) private readonly jwt: JwtProvider,
    ) {}
    @Post("/register")
    async register(@body() dto: Credentials) {
        if (
            typeof dto?.email !== "string" ||
            typeof dto.password !== "string" ||
            dto.password.length < 8
        )
            throw AppError.badRequest(
                "Email and a password of at least 8 characters are required",
            );
        const user = await this.users.create({
            email: dto.email,
            password: dto.password,
        });
        return { id: user.id, email: user.email };
    }
    @Post("/login")
    async login(@body() dto: Credentials) {
        if (typeof dto?.email !== "string" || typeof dto.password !== "string")
            throw AppError.unauthorized("Invalid credentials");
        const user = this.users.findByEmail(dto.email);
        if (!user || !(await bcrypt.compare(dto.password, user.passwordHash)))
            throw AppError.unauthorized("Invalid credentials");
        return this.jwt.issueTokens(user.id, {
            email: user.email,
            roles: user.roles,
            permissions: user.permissions,
        });
    }
    @Post("/refresh")
    refresh(@body() dto: { refreshToken: string }) {
        return this.jwt.rotateRefreshToken(dto?.refreshToken);
    }
    @Post("/logout")
    async logout(@body() dto: { refreshToken: string }) {
        await this.jwt.revokeRefreshSession(dto?.refreshToken);
        return { loggedOut: true };
    }
}
