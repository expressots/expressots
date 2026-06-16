import { provide } from "inversify-binding-decorators";
import jwt from "jsonwebtoken";
import ENV from "env";

@provide(JWTProvider)
class JWTProvider {
  public decodeToken(token) {
    return jwt.verify(token, ENV.Application.JWT_KEY);
  }

  public generateToken(payload) {
    return jwt.sign(payload, ENV.Application.JWT_KEY, {
      expiresIn: 10800000, // expires in 3hours
    });
  }
}

export { JWTProvider };
