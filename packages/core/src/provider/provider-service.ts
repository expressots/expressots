import { provideSingleton } from "../decorator";
import { Logger } from "./logger/logger-service";
import { EnvValidatorProvider } from "./environment/env-validator.provider";

interface IProvider {
    envValidator(): EnvValidatorProvider;
    logger(): Logger;
}

@provideSingleton(Provider)
class Provider implements IProvider {
    private envValidatorProvider: EnvValidatorProvider;
    private loggerProvider: Logger;
    
    constructor() {
        this.envValidatorProvider = new EnvValidatorProvider();
        this.loggerProvider = new Logger();
    }

    envValidator(): EnvValidatorProvider {
        return this.envValidatorProvider;
    }

    logger(): Logger {
        return this.loggerProvider;
    }
}

export { IProvider, Provider };
