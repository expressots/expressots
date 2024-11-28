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
   * Register a provider by binding it to itself with optional scope.
   * @param serviceIdentifier - The service identifier for the provider.
   * @param scope - The binding scope.
   * @public API
   */
  public register<T>(
    serviceIdentifier: interfaces.ServiceIdentifier<T>,
    scope?: interfaces.BindingScope,
  ): void;

  /**
   * Overload: Register a provider by binding a service identifier to a specific implementation with optional scope.
   * @param serviceIdentifier - The service identifier for the provider.
   * @param constructor - The implementation class.
   * @param scope - The binding scope.
   * @public API
   */
  public register<T>(
    serviceIdentifier: interfaces.ServiceIdentifier<T>,
    constructor: interfaces.Newable<T>,
    scope?: interfaces.BindingScope,
  ): void;

  /**
   * Register a provider with the container.
   * @public API
   */
  public register<T>(
    serviceIdentifier: interfaces.ServiceIdentifier<T>,
    constructorOrScope?: interfaces.Newable<T> | interfaces.BindingScope,
    scope: interfaces.BindingScope = BindingScopeEnum.Request,
  ): void {
    if (this.container.isBound(serviceIdentifier)) {
      this.logger.warn(
        `${(serviceIdentifier as unknown as IProvider).name} already registered`,
        "provider-manager",
      );
      return;
    }

    let binding: interfaces.BindingInWhenOnSyntax<T>;

    if (typeof constructorOrScope === "function") {
      // Overload where constructor is provided
      const constructor = constructorOrScope as interfaces.Newable<T>;
      const scopeDefinition = scope || BindingScopeEnum.Transient;

      binding = this.container.bind<T>(serviceIdentifier).to(constructor);
      this.applyScope(binding, scopeDefinition);
    } else {
      const scopeDefinition =
        (constructorOrScope as interfaces.BindingScope) ||
        BindingScopeEnum.Transient;

      binding = this.container.bind<T>(serviceIdentifier).toSelf();
      this.applyScope(binding, scopeDefinition);
    }
  }

  /**
   * Get a provider from the container.
   * @param serviceIdentifier - The service identifier to get from the container.
   * @returns An instance of the provider.
   * @public API
   */
  public get<T>(serviceIdentifier: interfaces.ServiceIdentifier<T>): T {
    if (!this.container.isBound(serviceIdentifier)) {
      this.logger.error(
        `${this.getServiceIdentifierName(serviceIdentifier)} not registered`,
        "ProviderManager",
      );
      throw new Error(
        `Provider ${this.getServiceIdentifierName(serviceIdentifier)} not registered`,
      );
    }
    return this.container.get<T>(serviceIdentifier);
  }

  /**
   * Apply the scope to the binding.
   * @param binding - The binding to apply the scope to.
   * @param scope - The scope to apply.
   * @private
   */
  private applyScope<T>(
    binding: interfaces.BindingInWhenOnSyntax<T>,
    scope: interfaces.BindingScope,
  ): void {
    switch (scope) {
      case BindingScopeEnum.Singleton:
        binding.inSingletonScope();
        break;
      case BindingScopeEnum.Request:
        binding.inRequestScope();
        break;
      case BindingScopeEnum.Transient:
      default:
        binding.inTransientScope();
        break;
    }
  }

  /**
   * Get the name of the service identifier for logging purposes.
   * @param serviceIdentifier - The service identifier.
   * @returns The name of the service identifier.
   * @private
   */
  private getServiceIdentifierName(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    serviceIdentifier: interfaces.ServiceIdentifier<any>,
  ): string {
    if (typeof serviceIdentifier === "function") {
      return serviceIdentifier.name;
    } else if (typeof serviceIdentifier === "symbol") {
      return serviceIdentifier.toString();
    } else {
      return serviceIdentifier as string;
    }
  }
}
