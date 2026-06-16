/**
 * Yup Validation Adapter
 * @module @expressots/core/validation
 *
 * Built-in adapter for the [yup](https://github.com/jquense/yup) validation
 * library. `yup` is declared as an *optional* peer dependency: install it
 * explicitly (`npm i yup`) to enable this adapter.
 *
 * @example
 * ```ts
 * import * as yup from "yup";
 * import { validationRegistry, createYupValidator } from "@expressots/core";
 *
 * validationRegistry.register(createYupValidator());
 *
 * const CreateUserSchema = yup.object({
 *   email: yup.string().email().required(),
 *   age:   yup.number().integer().min(18).required(),
 * });
 *
 * @controller("/users")
 * class UsersController {
 *   @Post("/")
 *   create(@body(CreateUserSchema) input: yup.InferType<typeof CreateUserSchema>) {
 *     // input is fully typed and validated
 *   }
 * }
 * ```
 */

import {
  IValidationAdapter,
  ValidationFieldError,
  ValidationOptions,
  ValidationResult,
} from "../validation.interface.js";

/** Subset of yup's surface we depend on, structurally typed. */
interface YupLikeSchema {
  readonly __isYupSchema__?: boolean;
  validate?(data: unknown, options?: YupOptions): Promise<unknown>;
  validateSync?(data: unknown, options?: YupOptions): unknown;
  cast?(data: unknown, options?: YupOptions): unknown;
}

interface YupOptions {
  abortEarly?: boolean;
  stripUnknown?: boolean;
  context?: unknown;
}

interface YupValidationError {
  name?: string;
  path?: string;
  message?: string;
  type?: string;
  value?: unknown;
  inner?: Array<YupValidationError>;
}

/**
 * Adapter for [yup](https://github.com/jquense/yup). Detects yup schemas at
 * runtime by checking for the `__isYupSchema__` brand or the presence of a
 * `validate` + `cast` method pair.
 *
 * @public API
 */
export class YupValidatorAdapter implements IValidationAdapter<YupLikeSchema> {
  readonly name = "yup";
  readonly priority = 80;

  canHandle(schema: unknown): boolean {
    if (schema === null || typeof schema !== "object") return false;
    const candidate = schema as YupLikeSchema;
    if (candidate.__isYupSchema__ === true) return true;
    return (
      typeof candidate.validate === "function" &&
      typeof candidate.cast === "function"
    );
  }

  async validate(
    data: unknown,
    schema: YupLikeSchema,
    options?: ValidationOptions,
  ): Promise<ValidationResult> {
    if (typeof schema.validate !== "function") {
      return {
        success: false,
        errors: [
          {
            path: "",
            message:
              "YupValidatorAdapter received a schema with no validate() method.",
            code: "invalid_schema",
          },
        ],
      };
    }

    try {
      const yupOptions: YupOptions = {
        abortEarly: options?.abortEarly ?? false,
        stripUnknown: options?.stripUnknown ?? false,
      };
      const validated = await schema.validate(data, yupOptions);
      return { success: true, data: validated };
    } catch (error) {
      const yupError = error as YupValidationError;
      // yup batches per-field issues into `inner` when abortEarly is false,
      // and emits a single message otherwise.
      const issues =
        yupError?.inner && yupError.inner.length > 0
          ? yupError.inner
          : [yupError];
      return {
        success: false,
        errors: this.mapIssues(issues),
      };
    }
  }

  async transform(data: unknown, schema: YupLikeSchema): Promise<unknown> {
    if (typeof schema.cast === "function") {
      try {
        return schema.cast(data);
      } catch {
        return data;
      }
    }
    return data;
  }

  private mapIssues(
    issues: Array<YupValidationError>,
  ): Array<ValidationFieldError> {
    return issues.map((issue) => ({
      path: issue.path ?? "",
      message: issue.message ?? "Validation failed",
      code: issue.type ?? "validation_error",
      received: issue.value,
    }));
  }
}

/**
 * Convenience factory matching the `createXxxValidator` naming used by the
 * other adapters. Equivalent to `new YupValidatorAdapter()`.
 *
 * @public API
 */
export function createYupValidator(): YupValidatorAdapter {
  return new YupValidatorAdapter();
}
