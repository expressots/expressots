import { Env } from "env";
import { createHash } from "crypto";
import { provide } from "inversify-binding-decorators";
import { ApplicationErrorCode } from "@providers/error/ErrorTypes";
import { ApplicationError } from "@providers/error/ApplicationError";
import { Report } from "@providers/error/ReportError.Provider";

const salt = Env.Security.SALT_FOR_HASH;

@provide(CryptoHashGenProvider)
class CryptoHashGenProvider {

  GeneratePasswordHash(password: string): string | ApplicationError {

    const hashedPass: string = createHash('sha256')
      .update(`${password}_${salt}`).digest('hex');

    if (!hashedPass) {
      const error: ApplicationError = Report.Error(new ApplicationError(
        ApplicationErrorCode.GeneralAppError,
        'Hashing password failed'),
        true, "crypto-hash-gen-provider") as ApplicationError;
      return error;
    }

    return hashedPass;
  }

  ComparePasswordHash(password: string, hash: string): boolean | ApplicationError {
    const comparison: boolean = hash === this.GeneratePasswordHash(password);

    if (!comparison) {
      const error: ApplicationError = Report.Error(new ApplicationError(
        ApplicationErrorCode.GeneralAppError,
        'Password comparison failed'),
        true, "crypto-hash-gen-provider") as ApplicationError;
      return error;
    }

    return comparison;
  }
}

export { CryptoHashGenProvider };