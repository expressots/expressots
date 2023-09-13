/**
 * Abstract class ApplicationBase.
 *
 * ApplicationBase serves as the foundational structure for building
 * server applications. It declares the lifecycle hooks that allow
 * subclasses to configure services, handle post-server initialization,
 * and perform cleanup when the server is shutting down. Extending
 * classes are required to provide implementations for these methods
 * to define specific behaviors for their particular use cases.
 *
 * @example
 * class Application extends ApplicationBase {
 *   protected configureServices() { //... }
 *   protected postServerInitialization() { //... }
 *   protected serverShutdown() { //... }
 * }
 *
 * @export
 * @abstract
 */
abstract class ApplicationBase {
  /**
   * Method to configure services that should be initialized
   * before the server starts. It must be implemented by the
   * extending class to set up necessary services or configurations.
   * Can return a Promise for async configuration.
   *
   * @abstract
   * @returns {void | Promise<void>}
   */
  protected abstract configureServices(): void | Promise<void>;

  /**
   * Method to configure services or actions that should be executed
   * after the server starts. It allows the extending class to perform
   * any necessary operations once the server is up and running.
   * Can return a Promise for async execution.
   *
   * @abstract
   * @returns {void | Promise<void>}
   */
  protected abstract postServerInitialization(): void | Promise<void>;

  /**
   * Method to perform any necessary actions or cleanup after the server
   * is shutting down. This might include closing database connections,
   * stopping background tasks, or other cleanup activities. It provides
   * a clean exit point for the server.
   * Can return a Promise for async cleanup.
   *
   * @abstract
   * @returns {void | Promise<void>}
   */
  protected abstract serverShutdown(): void | Promise<void>;
}

export { ApplicationBase };
