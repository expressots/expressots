/**
 * The AppError class extends the built-in Error class in JavaScript,
 * providing additional properties to manage custom application errors.
 * It captures detailed information about the error, including a status code
 * and an optional service identifier, which can be useful for error handling
 * and logging within the application.
 *
 * @extends {Error}
 */
class AppError extends Error {
  /**
   * The HTTP status code associated with the error.
   * Commonly used to define the HTTP response status code.
   */
  public statusCode: number;

  /**
   * The service identifier associated with the error.
   * This property can be used to trace the origin of the error in the application.
   * It is optional and can be left undefined.
   */
  public service?: string;

  /**
   * @param {string} message - The error message to be displayed.
   * @param {number} [statusCode=500] - The HTTP status code associated with the error (default: 500).
   * @param {string} [service] - The service identifier associated with the error.
   */
  constructor(message: string, statusCode?: number, service?: string) {
    super(message);
    this.statusCode = statusCode;
    if (message === null) {
      this.message = "";
    }
    this.service = service !== undefined ? service : undefined;
    Error.captureStackTrace(this, this.constructor);
  }
}

export { AppError };
