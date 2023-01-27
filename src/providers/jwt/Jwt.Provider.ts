import jwt from "jsonwebtoken";
import { Env } from "env";
import { provide } from "inversify-binding-decorators";
import { Report } from "@providers/error/ReportError.Provider";
import { ApplicationError } from "@providers/error/ApplicationError";
import { HttpStatusErrorCode } from "@providers/error/ErrorTypes";

@provide(JwtProvider)
class JwtProvider {
  /**
   * Function to verify the token
   * @param token Token to be verified
   * @param secretOrPublicToken Secret or public token to be used to verify the token
   * @param options Options to be used to verify the token
   * @returns Promise with the token decoded
   */

  async VerifyToken(token: string, secretOrPublicToken: jwt.Secret | jwt.GetPublicKeyOrSecret,
    options: jwt.VerifyOptions
  ): Promise<any> {
    return jwt.verify(token, secretOrPublicToken, options,
      (error: jwt.VerifyErrors, token: jwt.JwtPayload) => {
        if (error) {
          Report.Error(new ApplicationError(HttpStatusErrorCode.BadRequest,
            error.message), true, "jwt-verify");
        } else {
          return Promise.resolve(token);
        }
      })
  };

  /**
   * Function to generate a token
   * @param payload Payload to be used to generate the token
   * @param options Options to be used to generate the token
   * @returns Promise with the token generated
   * @throws ApplicationError
   */

  async GenerateToken(payload: string | object | Buffer, options: jwt.SignOptions): Promise<string
    | ApplicationError> {

    return new Promise((resolve: Function, reject: Function) => {
      jwt.sign(payload, Env.Security.JWT_SECRET as jwt.Secret,
        options, (error: Error, token: string) => {
          if (error) {
            reject(Report.Error(new ApplicationError(HttpStatusErrorCode.InternalServerError,
              error.message), true, "jwt-generate"));
          } else {
            resolve(token);
          }
        });
    }
    );
  }
}

export { JwtProvider };