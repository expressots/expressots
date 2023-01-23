// src/middlewares/fetchLoggedUser.middleware.ts
import { inject, injectable } from 'inversify';
import { NextFunction, Request, Response } from 'express';
import { BaseMiddleware } from 'inversify-express-utils';
import { IUser, User, UserDocument } from '@entities/User';
import { UserRepository } from '@repositories/user/User.Repository';
import { JsonWebTokenProvider } from '@providers/jwt/JsonWebToken.Provider';
import { provide } from 'inversify-binding-decorators';
import { TYPES } from '@providers/types/types.core';

@provide(FetchLoggedUserMiddleware)
class FetchLoggedUserMiddleware extends BaseMiddleware {
  constructor(
    private userRepository: UserRepository,
    @inject(TYPES.JsonWebTokenProvider)
    private readonly jsonWebTokenProvider: JsonWebTokenProvider
  ) {
    super();
  }

  public async handler(
    req: Request & { user: UserDocument },
    res: Response,
    next: NextFunction
  ): Promise<void | Response> {
    const token = req.headers.authorization?.replace(/bearer/i, "").replace(/\s/g, "");

    if (token === undefined) {
      return res.status(403).send({ "error": "You must provide an `Authorization` header" });
    }

    try {
      const payload: any = this.jsonWebTokenProvider.decode(token);

      req.user = await this.userRepository.FindOne(payload.id) as UserDocument;
    } catch (e) {
      return res.status(403).send({ "error": "Invalid token" });
    }

    next();
  }
}

export { FetchLoggedUserMiddleware };