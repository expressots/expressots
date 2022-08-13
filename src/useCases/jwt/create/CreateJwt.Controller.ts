// src/useCases/jwt/create/CreateJWT.Controller.ts
// ...
import { TYPES } from '@providers/types/Types.core';
import { UserRepository } from '@repositories/user/User.Repository';
import { Request, Response } from 'express';
import { inject } from 'inversify';
import { controller, httpPost, requestBody } from 'inversify-express-utils';
import { JsonWebTokenProvider } from '@providers/jwt/JsonWebToken.Provider';
import { IsPasswordMatch } from '@providers/crypto-password-hash-gen/CryptoHashPassword.Provider';

@controller("/tokens")
export class CreateJwtController {
  // ...
  public constructor(
    @inject(TYPES.JsonWebTokenProvider) private readonly jsonWebTokenService: JsonWebTokenProvider,
    // @inject(TYPES.DatabaseService) private readonly database: DatabaseService
    private userRepository: UserRepository
  ) { }

  @httpPost("")
  public async create(
    @requestBody() body: { email: string; password: string },
    req: Request,
    res: Response
  ) {

    const user = await this.userRepository.FindByEmail(body.email);

    if (IsPasswordMatch(user.hashedPassword, body.password)) {
      const token = this.jsonWebTokenService.encode({
        id: user.id,
        email: user.email,
      });
      return res.json({ token });
    }

    return res.sendStatus(400);
  }
}
