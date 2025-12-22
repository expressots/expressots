import { AppError } from "./app-error";
import { StatusCode } from "./status-code";

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

