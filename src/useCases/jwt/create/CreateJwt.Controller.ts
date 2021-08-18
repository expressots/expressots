// src/useCases/jwt/create/CreateJWT.Controller.ts
// ...
import { TYPES } from '@providers/types/types.core';
import { UserRepository } from '@repositories/user/User.Repository';
import {Request, Response} from 'express';
import { inject } from 'inversify';
import {controller, httpPost, requestBody} from 'inversify-express-utils';
import { JsonWebTokenService } from 'services/jsonWebTokens.service';
import {isPasswordMatch} from 'utils/password.utils';

@controller("/tokens")
export class CreateJwtController {
  // ...
  public constructor(
    @inject(TYPES.JsonWebTokenService) private readonly jsonWebTokenService: JsonWebTokenService,
    // @inject(TYPES.DatabaseService) private readonly database: DatabaseService
    private userRepository: UserRepository
  ) {}

  @httpPost("")
  public async create(
    @requestBody() body: { email: string; password: string },
    req: Request,
    res: Response
  ) {
    const user = await this.userRepository.findByEmail(body.email);

    if (!user) {
      return res.sendStatus(400);
    }

    if (isPasswordMatch(user.hashedPassword, body.password)) {
      const token = this.jsonWebTokenService.encode({
        id: user.id,
        email: user.email,
      });
      return res.json({ token });
    }

    return res.sendStatus(400);
  }
}
