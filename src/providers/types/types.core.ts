// src/providers/types/Types.core.ts
export const TYPES = {
    // ...
    // Middlewares
    FetchLoggedUserMiddleware: Symbol.for("FetchLoggedUserMiddleware"),
    // Server
    RouterController: Symbol.for("RouterController"),
    // Player
    CreatePlayerController: Symbol.for("CreatePlayerController"),
    FindAllPlayersController: Symbol.for("FindAllPlayersController"),
    FindPlayerController: Symbol.for("FindPlayerController"),
    DeletePlayerController: Symbol.for("DeletePlayerController"),
    UpdatePlayerController: Symbol.for("UpdatePlayerController"),
    // JWT
    JsonWebTokenService: Symbol.for("JsonWebTokenService"),
    CreateJwtController: Symbol.for("CreateJwtController"),
    CreateUserController: Symbol.for("CreateUserController"),
  };

