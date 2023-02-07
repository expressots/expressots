import { provide } from "inversify-binding-decorators";
import { StatusCode } from "./status-code";

@provide(AppError)
class AppError extends Error {

    private errorType: number = StatusCode.Unknown;

    constructor(errorType: number, errorMessage?: string) {
        super(errorMessage);

        if (errorMessage === undefined) {
            this.parseErrorType(errorType);
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

    private parseErrorType(errorType: number): void {

        const errorTypeListId: string[] = Object.keys(StatusCode).filter((key) => !isNaN(Number(key)));
        const errorTypesListNames: string[] = Object.keys(StatusCode).filter((key) => isNaN(Number(key)));

        for (let i = 0; i < errorTypeListId.length; i++) {
            if (Number(errorTypeListId[i]) === errorType) {
                this.errorType = errorType;
                this.message = errorTypesListNames[i].split(/(?=[A-Z])/).join(" ");
            }
        }
    }
}

export { AppError };