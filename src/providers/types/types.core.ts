import { DeleteUserController } from './../../useCases/user/delete/DeleteUser.Controller';
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
  // User
  CreateUserController: Symbol.for("CreateUserController"),
  DeleteUserController: Symbol.for("DeleteUserController"),
  FindByIdController: Symbol.for("FindByIdController"),
  UpdateUserController: Symbol.for("UpdateUserController"),
  FindALlUsersController: Symbol.for("FindALlUsersController"),
};

