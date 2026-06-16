import type { AuthProvider } from "@expressots/adapter-express";
import { provide } from "@expressots/core";
import type { NextFunction, Request, Response } from "express";
import * as jwt from "jsonwebtoken";
import { AppPrincipal, UserDetails } from "./app-principal";

const ANONYMOUS = new AppPrincipal({
    id: "",
    email: "",
    roles: [],
    permissions: [],
});

@provide(JwtAuthProvider)
export class JwtAuthProvider implements AuthProvider {
    private readonly secret = process.env.JWT_SECRET ?? "dev-secret-change-me-min-32-chars-long";

    async getUser(req: Request, _res: Response, _next: NextFunction) {
        const header = req.headers.authorization;
        if (!header?.startsWith("Bearer ")) {
            return ANONYMOUS;
        }

        try {
            const payload = jwt.verify(header.slice(7), this.secret) as UserDetails;
            return new AppPrincipal(payload);
        } catch {
            return ANONYMOUS;
        }
    }
}
