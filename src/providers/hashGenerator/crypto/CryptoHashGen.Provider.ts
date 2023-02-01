import fs from 'fs';
import { Env } from "env";
import { createHash, generateKeyPairSync } from "crypto";
import { provide } from "inversify-binding-decorators";
import { ApplicationErrorCode } from "@providers/error/ErrorTypes";
import { AppError } from "@providers/error/ApplicationError";
import { Report } from "@providers/error/ReportError.Provider";

const salt = Env.Security.SALT_FOR_HASH;

@provide(CryptoHashGenProvider)
class CryptoHashGenProvider {

  GeneratePasswordHash(password: string): string | AppError {

    const hashedPass: string = createHash('sha256')
      .update(`${password}_${salt}`).digest('hex');

    if (!hashedPass) {
      const error: AppError = Report.Error(new AppError(
        ApplicationErrorCode.GeneralAppError,
        'Hashing password failed'),
        "crypto-hash-gen-provider");
      return error;
    }

    return hashedPass;
  }

  ComparePasswordHash(password: string, hash: string): boolean | AppError {
    const comparison: boolean = hash === this.GeneratePasswordHash(password);

    if (!comparison) {
      const error: AppError = Report.Error(new AppError(
        ApplicationErrorCode.GeneralAppError,
        'Password comparison failed'),
        "crypto-hash-gen-provider");
      return error;
    }

    return comparison;
  }

  async GeneratePrivatePublicKeyPair(): Promise<void> {
    const keyPair = await generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicExponent: 65537,
      privateKeyEncoding: {
        type: "pkcs8",
        format: "pem",
      },
      publicKeyEncoding: {
        type: "spki",
        format: "pem",
      },
    });

    fs.writeFileSync('./private.pem', keyPair.privateKey);
    fs.writeFileSync('./public.pem', keyPair.publicKey);
  }
}

export { CryptoHashGenProvider };