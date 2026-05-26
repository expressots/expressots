/**
 * Zod Validation Adapter
 * @module @expressots/core/validation
 *
 * Built-in adapter for the [zod](https://zod.dev) validation library.
 * `zod` is declared as an *optional* peer dependency: install it explicitly
 * (`npm i zod`) to enable this adapter; otherwise validation falls back to
 * the next registered adapter.
 *
 * @example
 * ```ts
 * import { z } from "zod";
 * import { validationRegistry, ZodValidatorAdapter, createZodValidator } from "@expressots/core";
 *
 * validationRegistry.register(createZodValidator());
 *
 * const CreateUserSchema = z.object({
 *   email: z.string().email(),
 *   age:   z.number().int().min(18),
 * });
 *
 * @controller("/users")
 * class UsersController {
 *   @Post("/")
 *   create(@body(CreateUserSchema) input: z.infer<typeof CreateUserSchema>) {
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

/**
 * Minimal structural typing for the subset of zod we actually call. We cannot
 * import zod directly from core (it is an optional peer), but we type the
 * schema we receive as `unknown` and refine via the runtime `canHandle` check.
 */
interface ZodLikeSchema {
  readonly _def?: unknown;
  parse?(data: unknown): unknown;
  parseAsync?(data: unknown): Promise<unknown>;
  safeParseAsync?(data: unknown): Promise<{
    success: boolean;
    data?: unknown;
    error?: { issues: Array<ZodIssue> };
  }>;
  safeParse?(data: unknown): {
    success: boolean;
    data?: unknown;
    error?: { issues: Array<ZodIssue> };
  };
}

interface ZodIssue {
  path: Array<string | number>;
  message: string;
  code?: string;
  received?: unknown;
}

/**
 * Adapter for [zod](https://zod.dev). Picks up any zod schema (`z.object`,
 * `z.string`, ...) at runtime by structural detection — no compile-time
 * dependency on `zod` is required.
 *
 * @public API
 */
export class ZodValidatorAdapter implements IValidationAdapter<ZodLikeSchema> {
  readonly name = "zod";
  readonly priority = 90;

  canHandle(schema: unknown): boolean {
    if (schema === null || typeof schema !== "object") return false;
    const candidate = schema as ZodLikeSchema;
    return (
      typeof candidate.safeParseAsync === "function" ||
      typeof candidate.safeParse === "function" ||
      typeof candidate.parseAsync === "function" ||
      typeof candidate.parse === "function"
    );
  }

  async validate(
    data: unknown,
    schema: ZodLikeSchema,
    // ValidationOptions accepted for interface compliance; Zod surfaces its own
    // configuration through the schema itself, so options are not consumed here.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options?: ValidationOptions,
  ): Promise<ValidationResult> {
    try {
      // Prefer the safe variants because they encode the failure mode in the
      // result rather than throwing.
      if (typeof schema.safeParseAsync === "function") {
        const r = await schema.safeParseAsync(data);
        return r.success
          ? { success: true, data: r.data }
          : { success: false, errors: this.mapIssues(r.error?.issues ?? []) };
      }
      if (typeof schema.safeParse === "function") {
        const r = schema.safeParse(data);
        return r.success
          ? { success: true, data: r.data }
          : { success: false, errors: this.mapIssues(r.error?.issues ?? []) };
      }
      if (typeof schema.parseAsync === "function") {
        const parsed = await schema.parseAsync(data);
        return { success: true, data: parsed };
      }
      if (typeof schema.parse === "function") {
        const parsed = schema.parse(data);
        return { success: true, data: parsed };
      }

      return {
        success: false,
        errors: [
          {
            path: "",
            message:
              "ZodValidatorAdapter received a schema with no parse/safeParse method.",
            code: "invalid_schema",
          },
        ],
      };
    } catch (error) {
      // zod throws ZodError for `parse`/`parseAsync`. Pull issues if present.
      const maybeIssues = (error as { issues?: Array<ZodIssue> })?.issues;
      if (Array.isArray(maybeIssues)) {
        return { success: false, errors: this.mapIssues(maybeIssues) };
      }
      return {
        success: false,
        errors: [
          {
            path: "",
            message:
              error instanceof Error ? error.message : "Validation failed unexpectedly",
            code: "validation_error",
          },
        ],
      };
    }
  }

  async transform(data: unknown, schema: ZodLikeSchema): Promise<unknown> {
    const result = await this.validate(data, schema);
    return result.success ? result.data : data;
  }

  private mapIssues(issues: Array<ZodIssue>): Array<ValidationFieldError> {
    return issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
      code: issue.code ?? "validation_error",
      received: issue.received,
    }));
  }
}

/**
 * Convenience factory matching the `createXxxValidator` naming used by the
 * other adapters. Equivalent to `new ZodValidatorAdapter()`.
 *
 * @public API
 */
export function createZodValidator(): ZodValidatorAdapter {
  return new ZodValidatorAdapter();
}
