import { Controller } from "@expressots/adapter-express";
import { Response } from "express";
/**
 * The BaseController class is an abstract base class for controllers.
 * It provides methods for handling use case calls and sending appropriate responses.
 * @provide BaseController
 */
export abstract class BaseController implements Controller {
  /**
   * Calls an asynchronous use case and sends an appropriate response based on the result.
   * @param useCase - A promise representing the asynchronous use case to call.
   * @param res - The Express response object.
   * @param successStatusCode - The HTTP status code to return upon successful execution.
   */
  protected async callUseCaseAsync<T>(
    useCase: Promise<T>,
    res: Response,
    successStatusCode: number = 200,
  ): Promise<void> {
    try {
      const result = await useCase;
      res.status(successStatusCode).json(result);
    } catch (error: Error | unknown) {
      this.handleError(res, error);
    }
  }

  /**
   * Calls a use case and sends an appropriate response based on the result.
   * @param useCase - The use case to call.
   * @param res - The Express response object.
   * @param successStatusCode - The HTTP status code to return upon successful execution.
   */
  protected callUseCase<T>(
    useCase: T,
    res: Response,
    successStatusCode: number = 200,
  ): void {
    try {
      res.status(successStatusCode).json(useCase);
    } catch (error: Error | unknown) {
      this.handleError(res, error);
    }
  }

  /**
   * Handles errors by sending a 500 status with an error message.
   * This method can be extended to provide more detailed error handling.
   *
   * @param res - The Express response object.
   * @param error - The error that occurred during the execution of the use case.
   */
  private handleError(res: Response, error: unknown): void {
    res.status(500).json({
      message: "An unexpected error occurred.",
      error: error instanceof Error ? error.message : error,
    });
  }
}
