import {sign, verify} from 'jsonwebtoken';
import { Env } from 'Env';
import { injectable } from 'inversify';

@injectable()
export class JsonWebTokenService {
  private readonly JWT_PRIVATE_KEY = Env.Security.JWT_PRIVATE_KEY;

  encode(payload: Object): string {
    console.log(this.JWT_PRIVATE_KEY);
    return sign(payload, this.JWT_PRIVATE_KEY, { expiresIn: "1 day" });
  }

  decode(token: string): Object {
    return verify(token, this.JWT_PRIVATE_KEY);
  }
}

