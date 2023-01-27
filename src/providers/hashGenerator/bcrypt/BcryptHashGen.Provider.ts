import bcrypt from "bcrypt";

import { ApplicationError } from "@providers/error/ApplicationError";
import { provide } from "inversify-binding-decorators";
import { Report } from "@providers/error/ReportError.Provider";
import { HttpStatusErrorCode } from "@providers/error/ErrorTypes";

const SALT_ROUNDS = 10;

@provide(BcryptHashGenProvider)
class BcryptHashGenProvider {

    async GeneratePasswordHash(password: string): Promise<string | ApplicationError> {

        return new Promise((resolve: Function, reject: Function) => {
            bcrypt.hash(password, SALT_ROUNDS, (error: Error, hash: string) => {
                if (error) {
                    reject(
                        Report.Error(new ApplicationError(
                            HttpStatusErrorCode.BadRequest,
                            error ? error.message : " Error to generate password hash"),
                            true, "password-encrypt") as ApplicationError
                    );
                } else {
                    resolve(hash);
                }
            });
        });
    }

    async ComparePasswordHash(password: string, hash: string): Promise<boolean | ApplicationError> {
        return new Promise((resolve: Function, reject: Function) => {
            bcrypt.compare(password, hash, (error: Error, result: boolean) => {
                if (error) {
                    reject(
                        Report.Error(new ApplicationError(
                            HttpStatusErrorCode.BadRequest,
                            error ? error.message : "Error to compare password hash"),
                            true, "password-encrypt") as ApplicationError
                    );
                } else {
                    resolve(result);
                }
            });
        });
    }
}

export { BcryptHashGenProvider };