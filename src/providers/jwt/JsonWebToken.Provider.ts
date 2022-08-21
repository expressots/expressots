import { sign, verify } from "jsonwebtoken";
import { Env } from "env";
import { provide } from "inversify-binding-decorators";

@provide(JsonWebTokenProvider)
class JsonWebTokenProvider {
  private readonly JWT_PRIVATE_KEY = Env.Security.JWT_PRIVATE_KEY;

  encode(payload: Object): string {
    console.log(this.JWT_PRIVATE_KEY);
    return sign(payload, this.JWT_PRIVATE_KEY, { expiresIn: "1 day" });
  }

  decode(token: string): Object {
    return verify(token, this.JWT_PRIVATE_KEY);
  }
}

export { JsonWebTokenProvider };