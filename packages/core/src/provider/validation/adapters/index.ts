/**
 * Validation Adapters
 * @module @expressots/core/validation/adapters
 *
 * Built-in adapters for validation libraries. The validation libraries
 * themselves (`class-validator`, `zod`, `yup`) are *optional peer
 * dependencies* — install only the one(s) you actually use.
 *
 * Additional Joi adapter is on the roadmap.
 */

export { ClassValidatorAdapter } from "./class-validator.adapter.js";
export { ZodValidatorAdapter, createZodValidator } from "./zod.adapter.js";
export { YupValidatorAdapter, createYupValidator } from "./yup.adapter.js";
