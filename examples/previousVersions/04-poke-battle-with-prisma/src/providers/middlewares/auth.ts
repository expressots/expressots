import { JWTProvider } from "@providers/encrypt/jwt/jwt.provider";
import { Request, Response, NextFunction } from "express";

function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Response<any, Record<string, any>> | void {
  const jwtProvider: JWTProvider = new JWTProvider();

  const token = req.headers["authorization"];

  if (!token) {
    return res
      .status(401)
      .json({ auth: false, message: "Sem token na requisição" });
  }

  try {
    const decoded = jwtProvider.decodeToken(token);

    req.headers["decoded"] = decoded as string;
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ auth: false, message: "Token expirado ou incorreto." });
  }
}

export default authMiddleware;
