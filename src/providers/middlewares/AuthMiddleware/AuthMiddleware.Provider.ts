import { StatusCode } from "@providers/error/ErrorTypes";
import { Env } from "env";
import { Request, Response, NextFunction } from "express";

const AuthMiddleware = (req: Request, res: Response, next: NextFunction) => {

    const secret = Env.Security.JWT_SECRET;
    const authHeader = req.get("Authorization");

    if (authHeader === secret) {
        const token: string = authHeader.split(" ")[1];
        return next();
    } else {
        return res.status(StatusCode.Unauthorized).json({ error: StatusCode.Unauthorized, message: "You don't sufficient privileges" });
    }
}

export default AuthMiddleware;