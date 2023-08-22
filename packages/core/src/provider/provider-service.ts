import { provideSingleton } from "../decorator";
import { Logger } from "./logger/logger-service";
import { EnvValidatorProvider } from "./environment/env-validator.provider";

/**
 * Interface defining the methods for the Provider class.
 */
interface IProvider {
    /**
     * Returns an instance of the `EnvValidatorProvider`.
     */
    envValidator(): EnvValidatorProvider;

    /**
     * Returns an instance of the `Logger`.
     */
    logger(): Logger;
}

/**
 * Class responsible for providing singleton instances of various services.
 * 
 * This class implements the IProvider interface and is decorated with a
 * singleton provider to ensure a single instance is reused.
 */
@provideSingleton(Provider)
class Provider implements IProvider {
    private envValidatorProvider: EnvValidatorProvider;
    private loggerProvider: Logger;
    
    /**
     * Initializes the instances of `EnvValidatorProvider` and `Logger`.
     */
    constructor() {
        this.envValidatorProvider = new EnvValidatorProvider();
        this.loggerProvider = new Logger();
    }

    /**
     * Returns the singleton instance of the `EnvValidatorProvider`.
     *
     * @returns The `EnvValidatorProvider` instance.
     */
    envValidator(): EnvValidatorProvider {
        return this.envValidatorProvider;
    }

    /**
     * Returns the singleton instance of the `Logger`.
     *
     * @returns The `Logger` instance.
     */
    logger(): Logger {
        return this.loggerProvider;
    }
}

export { IProvider, Provider };
