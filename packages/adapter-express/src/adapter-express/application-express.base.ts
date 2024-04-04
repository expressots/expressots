import { provide } from "inversify-binding-decorators";

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
@provide(ApplicationBase)
export abstract class ApplicationBase {
  /**
   * Implement this method to set up required services or configurations before
   * the server starts. This is essential for initializing dependencies or settings
   * necessary for server operation. Supports asynchronous setup with a Promise.
   *
   * @abstract
   * @returns {void | Promise<void>}
   */
  protected abstract configureServices(): void | Promise<void>;

  /**
   * Implement this method to execute actions or configurations after the server
   * has started. Use this for operations that need to run once the server is
   * operational. Supports asynchronous execution with a Promise.
   *
   * @abstract
   * @returns {void | Promise<void>}
   */
  protected abstract postServerInitialization(): void | Promise<void>;

  /**
   * Implement this method to handle cleanup and final actions when the server
   * is shutting down. Ideal for closing resources, stopping tasks, or other
   * cleanup procedures to ensure a graceful server shutdown. Supports asynchronous
   * cleanup with a Promise.
   */
  protected abstract serverShutdown(): void | Promise<void>;
}
