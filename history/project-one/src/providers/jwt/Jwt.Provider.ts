import jwt from "jsonwebtoken";
import fs from "fs";
import { Env } from "env";
import { provide } from "inversify-binding-decorators";
import { Report } from "@providers/core/error/ReportError.Provider";
import { AppError } from "@providers/core/error/ApplicationError";
import { StatusCode } from "@providers/core/error/ErrorTypes";

@provide(JwtProvider)
class JwtProvider {
  /**
   * Function to generate a JWT token
   * @param payload Payload to be used to generate the token
   * @param expiresIn Expiration time of the token
   * @returns Promise with the token generated
   */
  async SignJWT(payload: string | object | Buffer, expiresIn: string | number): Promise<string
    | AppError> {

    // get private key from private.pem file
    const privateKey: string = fs.readFileSync('./private.pem', 'utf8');

    return new Promise((resolve: Function, reject: Function) => {
      jwt.sign(payload, privateKey, {
        algorithm: "RS256", expiresIn
      }, (error: Error, token: string) => {
        if (error) {
          reject(Report.Error(new AppError(
            StatusCode.InternalServerError),
            error.message), "jwt-generate");
        } else {
          resolve(token);
        }
      });
    });
  };

  /**
   * Function to verify a JWT token
   * @param token Token to be verified
   * @returns Promise with the payload of the token
   * and a boolean indicating if the token is expired
  */
  async VerifyJWT(token: string) {
    // get public key from private.pem file
    const publicKey: string = fs.readFileSync('./public.pem', 'utf8');

    try {
      const decoded = jwt.verify(token, publicKey);
      return Promise.resolve({ payload: decoded, expired: false });
    } catch (error: any) {
      return Promise.reject({ payload: null, expired: error.message.includes("JWT expired") });
    }
  };
}

export { JwtProvider };