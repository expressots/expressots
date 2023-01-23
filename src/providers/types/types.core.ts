// src/providers/types/Types.core.ts
export const TYPES = {
  // ...
  // Middlewares
  FetchLoggedUserMiddleware: Symbol.for("FetchLoggedUserMiddleware"),
  // Server
  RouterController: Symbol.for("RouterController"),
  // JWT
  JsonWebTokenProvider: Symbol.for("JsonWebTokenProvider"),
  CreateJwtController: Symbol.for("CreateJwtController"),
  CreateUserController: Symbol.for("CreateUserController"),
};

