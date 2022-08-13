import { AllErrors, ApplicationErrorCode, ErrorType, GeneralErrorCode, HttpStatusErrorCode } from "./ErrorTypes";

class ApplicationError extends Error {
    private errorType: ErrorType = GeneralErrorCode.Unknown;

    constructor(errorType: ErrorType, errorMessage?: string) {
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

    public get ErrorType(): ErrorType {
        return this.errorType;
    }

    private ParseErrorType(errorType: ErrorType): void {

        const errorTypesListIds = Object.keys(AllErrors).filter(key => !isNaN(Number(key)));
        const errorTypesListNames = Object.keys(AllErrors).filter(key => isNaN(Number(key)));

        for (let i: number = 0; i < errorTypesListIds.length; i++) {
            if (Number(errorTypesListIds[i]) === errorType) {
                this.errorType = errorType;
                this.message = errorTypesListNames[i].split(/(?=[A-Z])/).join(" ");
            }
        }
    }
}

export { ApplicationError };