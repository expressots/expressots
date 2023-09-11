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
  envValidator: EnvValidatorProvider;

  /**
   * Returns an instance of the `Logger`.
   */
  logger: Logger;
}

/**
 * Class responsible for providing singleton instances of various services.
 *
 * This class implements the IProvider interface and is decorated with a
 * singleton provider to ensure a single instance is reused.
 */
@provideSingleton(Provider)
class Provider implements IProvider {
  envValidator: EnvValidatorProvider;
  logger: Logger;

  /**
   * Initializes the instances of the various providers.
   */
  constructor() {
    this.envValidator = new EnvValidatorProvider();
    this.logger = new Logger();
  }
}

export { IProvider, Provider };
