import { provide } from "@expressots/core";
import { Request, Response, NextFunction } from "express";

@provide({{className}}Guard)
export class {{className}}Guard {
    canActivate(req: Request, res: Response, next: NextFunction): void {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        // TODO: Validate token
        next();
    }
}

