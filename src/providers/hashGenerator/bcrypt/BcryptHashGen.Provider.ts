import bcrypt from "bcrypt";

import { AppError } from "@providers/error/ApplicationError";
import { provide } from "inversify-binding-decorators";
import { Report } from "@providers/error/ReportError.Provider";
import { StatusCode } from "@providers/error/ErrorTypes";

const SALT_ROUNDS = 10;

@provide(BcryptHashGenProvider)
class BcryptHashGenProvider {

    async GeneratePasswordHash(password: string): Promise<string | AppError> {

        return new Promise((resolve: Function, reject: Function) => {
            bcrypt.hash(password, SALT_ROUNDS, (error: Error, hash: string) => {
                if (error) {
                    reject(
                        Report.Error(new AppError(
                            StatusCode.BadRequest,
                            error ? error.message : " Error to generate password hash"),
                            "password-encrypt"));
                } else {
                    resolve(hash);
                }
            });
        });
    }

    async ComparePasswordHash(password: string, hash: string): Promise<boolean | AppError> {
        return new Promise((resolve: Function, reject: Function) => {
            bcrypt.compare(password, hash, (error: Error, result: boolean) => {
                if (error) {
                    reject(
                        Report.Error(new AppError(
                            StatusCode.BadRequest,
                            error ? error.message : "Error to compare password hash"),
                            "password-encrypt"));
                } else {
                    resolve(result);
                }
            });
        });
    }
}

export { BcryptHashGenProvider };