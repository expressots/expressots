const TYPES = {
  // Middlewares
  FetchLoggedUserMiddleware: Symbol.for("FetchLoggedUserMiddleware"),
  // Server
  RouterController: Symbol.for("RouterController"),
  // JWT
  JwtProvider: Symbol.for("JwtProvider"),
  CreateJwtController: Symbol.for("CreateJwtController"),
  // User
  CreateUserController: Symbol.for("CreateUserController"),
  DeleteUserController: Symbol.for("DeleteUserController"),
  FindByIdController: Symbol.for("FindByIdController"),
  UpdateUserController: Symbol.for("UpdateUserController"),
  FindALlUsersController: Symbol.for("FindALlUsersController"),
};

export { TYPES };