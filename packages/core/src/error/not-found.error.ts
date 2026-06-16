import { AppError } from "./app-error.js";
import { StatusCode } from "./status-code.js";

/**
 * NotFoundError - Specific error type for resource not found scenarios
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      `${resource}${id ? ` with id ${id}` : ""} not found`,
      StatusCode.NotFound,
      undefined,
      {
        type: "https://expressots.dev/errors/not-found",
        details: { resource, id },
      },
    );
  }
}
