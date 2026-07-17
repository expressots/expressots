/**
 * Validation System
 * @module @expressots/core/validation
 *
 * ExpressoTS Smart Validation System
 *
 * Features:
 * - Pluggable adapter architecture (class-validator, Zod, Yup, custom)
 * - TypeScript-first auto-validation
 * - Smart field detection (email, phone, url, password, etc.)
 * - Helpful error messages with examples and hints
 * - Universal parameter validation (@body, @query, @param, @headers)
 */

// Interfaces and types
export type {
  IValidationAdapter,
  ValidationConfig,
  ValidationContext,
  ValidationFieldError,
  ValidationMetadata,
  ValidationOptions,
  ValidationResult,
  ParameterSource,
  SmartFieldPattern,
} from "./validation.interface.js";

// Core components
export {
  ValidationRegistry,
  validationRegistry,
} from "./validation-registry.js";
export { schemaToJsonSchema } from "./schema-extract.js";
export { SmartFieldDetector } from "./smart-field-detector.js";
export {
  HelpfulErrorFormatter,
  type ErrorFormat,
  type FormattedErrorResponse,
} from "./helpful-error-formatter.js";

// Type inference utilities
export {
  getParameterType,
  getAllParameterTypes,
  getClassProperties,
  hasClassValidatorDecorators,
  isZodSchema,
  isClassConstructor,
  detectSchemaType,
  type InferredTypeInfo,
  type InferredPropertyInfo,
} from "./type-inference.js";

// Built-in adapters
export {
  ClassValidatorAdapter,
  ZodValidatorAdapter,
  createZodValidator,
  YupValidatorAdapter,
  createYupValidator,
} from "./adapters/index.js";
