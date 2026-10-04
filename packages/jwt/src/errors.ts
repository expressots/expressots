import { AppError } from "@expressots/core";
export type JwtErrorCode =
  "JWT_CONFIGURATION" | "JWT_INVALID" | "JWT_EXPIRED" | "JWT_REPLAY";
export class JwtError extends AppError {
  constructor(readonly jwtCode: JwtErrorCode) {
    const configuration = jwtCode === "JWT_CONFIGURATION";
    super(
      configuration
        ? "JWT provider configuration is invalid"
        : "Invalid or expired authentication token",
      configuration ? 500 : 401,
      "JwtProvider",
      { errorCode: jwtCode },
    );
  }
}
