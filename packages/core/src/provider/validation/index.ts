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
} from "./validation.interface";

// Core components
export { ValidationRegistry } from "./validation-registry";
export { SmartFieldDetector } from "./smart-field-detector";
export {
  HelpfulErrorFormatter,
  type ErrorFormat,
  type FormattedErrorResponse,
} from "./helpful-error-formatter";

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
} from "./type-inference";

// Built-in adapters
export { ClassValidatorAdapter } from "./adapters";

