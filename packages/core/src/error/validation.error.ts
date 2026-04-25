import {
  AppError,
  type ValidationError as ValidationErrorType,
} from "./app-error.js";
import { StatusCode } from "./status-code.js";

/**
 * ValidationError - Specific error type for validation failures
 */
export class ValidationError extends AppError {
  public errors: Array<ValidationErrorType>;

  constructor(errors: Array<ValidationErrorType>) {
    super("Validation failed", StatusCode.UnprocessableEntity, undefined, {
      type: "https://expressots.dev/errors/validation-failed",
      validationErrors: errors,
    });
    this.errors = errors;
  }
}
