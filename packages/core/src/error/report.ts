import { provide } from "inversify-binding-decorators";

interface IAppError {
    statusCode: number;
    message: string;
    service?: string
}

@provide(Report)
class Report extends Error {
    constructor() {
        super()
    }

    public Error(appError: IAppError) {
        
        throw { ...appError, name: this.name, stack: this.stack };
    }
}

export { Report, IAppError };

