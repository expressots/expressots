// src/services/jsonWebToken.service.ts
import {injectable} from 'inversify';
import {sign, verify} from 'jsonwebtoken';

@injectable()
export class JsonWebTokenService {
  private readonly JWT_PRIVATE_KEY = "123456789";

  encode(payload: Object): string {
    return sign(payload, this.JWT_PRIVATE_KEY, { expiresIn: "1 day" });
  }

  decode(token: string): Object {
    return verify(token, this.JWT_PRIVATE_KEY);
  }
}

