import { BindingScopeEnum, interfaces } from "../di/inversify";
import { Logger } from "./logger/logger.provider";

/**
 * Provider Interface - Represents a provider object with name, version, author, and repository information.
 * @public API
 */
export interface IProvider {
  name: string;
  version: string;
  author: string;
  repo: string;
}

type ClassType<T> = new () => T;

/**
 * ProviderManager Class - A class for managing dependency injection providers.
 * @public API
 */
export class ProviderManager {
  private container: interfaces.Container;
  private logger: Logger = new Logger();

  constructor(container: interfaces.Container) {
    this.container = container;
  }

  /**
   * Register a provider with the container.
   * @param serviceIdentifier - The service identifier for the provider.
   * @param scope - The binding scope for the provider.
   * @public API
   */
  public register(
    serviceIdentifier: interfaces.ServiceIdentifier<unknown>,
    scope: interfaces.BindingScope = BindingScopeEnum.Request,
  ): void {
    if (this.container.isBound(serviceIdentifier)) {
      this.logger.warn(
        `${(serviceIdentifier as unknown as IProvider).name} already registered`,
        "provider-manager",
      );
      return;
    }

    switch (scope) {
      case BindingScopeEnum.Singleton:
        this.container.bind(serviceIdentifier).toSelf().inSingletonScope();
        break;
      case BindingScopeEnum.Transient:
        this.container.bind(serviceIdentifier).toSelf().inTransientScope();
        break;
      case BindingScopeEnum.Request:
        this.container.bind(serviceIdentifier).toSelf().inRequestScope();
        break;
    }
  }

  /**
   * Get a provider from the container.
   * @param provider - The provider class to get from the container.
   * @returns An instance of the provider.
   * @public API
   */
  public get<P>(provider: ClassType<P>): P {
    const serviceIdentifier = this.container.get<P>(provider);

    if (!serviceIdentifier) {
      this.logger.error(`${provider.name} not registered`, "provider-manager");
      throw new Error(`Provider ${provider.name} not registered`);
    }
    return serviceIdentifier;
  }
}
