import * as jwt from "jsonwebtoken";
import { UserDetails } from "../src/auth/app-principal";

export function signTestToken(details: Partial<UserDetails> & { id: string }): string {
    const secret = process.env.JWT_SECRET ?? "dev-secret-change-me-min-32-chars-long";
    const payload: UserDetails = {
        id: details.id,
        email: details.email ?? "test@expressots.dev",
        roles: details.roles ?? ["user"],
        permissions: details.permissions ?? ["profile:read"],
    };

    return jwt.sign(payload, secret, { expiresIn: "15m" });
}
