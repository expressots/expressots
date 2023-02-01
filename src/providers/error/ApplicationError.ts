import { StatusCode } from "./ErrorTypes";

class ApplicationError extends Error {
    private errorType: number = StatusCode.Unknown;

    constructor(errorType: number, errorMessage?: string) {
        super(errorMessage);

        if (errorMessage === undefined) {
            this.ParseErrorType(errorType);
        } else {
            this.errorType = errorType;
            this.message = errorMessage;
        }
    }

    public get Message(): string {
        return this.message;
    }

    public get ErrorType(): number {
        return this.errorType;
    }

    private ParseErrorType(errorType: number): void {

        const errorTypesListIds = Object.keys(StatusCode).filter(key => !isNaN(Number(key)));
        const errorTypesListNames = Object.keys(StatusCode).filter(key => isNaN(Number(key)));

        for (let i: number = 0; i < errorTypesListIds.length; i++) {
            if (Number(errorTypesListIds[i]) === errorType) {
                this.errorType = errorType;
                this.message = errorTypesListNames[i].split(/(?=[A-Z])/).join(" ");
            }
        }
    }
}

export { ApplicationError as AppError };