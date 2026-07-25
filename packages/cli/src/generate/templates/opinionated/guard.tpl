import { provide } from "@expressots/core";
import { Request, Response, NextFunction } from "express";

/**
 * {{className}} Guard
 *
 * Usage:
 * @controller("/protected")
 * @Use({{className}}Guard)
 * export class ProtectedController { }
 */
@provide({{className}}Guard)
export class {{className}}Guard {
    /**
     * Check if the request is authorized
     */
    canActivate(req: Request, res: Response, next: NextFunction): void {
        // TODO: Implement authorization logic
        const isAuthorized = this.checkAuthorization(req);

        if (!isAuthorized) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        next();
    }

    private checkAuthorization(req: Request): boolean {
        // Example: Check for authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return false;
        }

        // TODO: Validate token/credentials
        return true;
    }
}

