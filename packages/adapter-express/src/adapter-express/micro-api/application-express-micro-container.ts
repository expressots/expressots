import { Container, interfaces } from "@expressots/core";

/**
 * Inversion of Control Container interface
 * @public API
 */
export interface IIOC {
  addSingleton<T>(concrete: interfaces.Newable<T>): void;
  addTransient<T>(concrete: interfaces.Newable<T>): void;
  addScoped<T>(concrete: interfaces.Newable<T>): void;
  get<I>(identifier: interfaces.ServiceIdentifier<I>): I;
}

/**
 * Inversion of Control Container
 * @public API
 */
export class IOC {
  private container: Container;

  constructor(containerOptions?: interfaces.ContainerOptions) {
    this.container = new Container(containerOptions);
  }

  /**
   * Add a singleton to the container
   * @param identifierOrConcrete - The identifier or concrete class
   * @param concrete - The concrete class if identifier is provided
   * @public API
   */
  public addSingleton<T>(concrete: interfaces.Newable<T>): void {
    this.container.bind(concrete).toSelf().inSingletonScope();
  }

  /**
   * Add a transient to the container
   * @param identifierOrConcrete - The identifier or concrete class
   * @param concrete - The concrete class if identifier is provided
   * @public API
   */
  public addTransient<T>(concrete: interfaces.Newable<T>): void {
    this.container.bind(concrete).toSelf().inTransientScope();
  }

  /**
   * Add a scoped to the container
   * @param identifierOrConcrete - The identifier or concrete class
   * @param concrete - The concrete class if identifier is provided
   * @public API
   */
  public addScoped<T>(concrete: interfaces.Newable<T>): void {
    this.container.bind(concrete).toSelf().inRequestScope();
  }

  /**
   * Get an instance from the container
   * @param identifier - The identifier for the instance
   * @returns The resolved instance
   * @public API
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public get(identifier: interfaces.ServiceIdentifier): any {
    return this.container.get(identifier);
  }
}
