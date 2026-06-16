/**
 * Validation Service
 * @module @expressots/adapter-express
 *
 * Service for validating request parameters using the Smart Validation System.
 * Integrates with the route handler to automatically validate parameters.
 */

import type { Request, Response } from "express";
import {
  ValidationRegistry,
  SmartFieldDetector,
  HelpfulErrorFormatter,
  ValidationResult,
  ValidationFieldError,
  ValidationConfig,
  getParameterType,
  hasClassValidatorDecorators,
  detectSchemaType,
  ClassValidatorAdapter,
} from "@expressots/core";
import { getValidationMetadata, ValidationSchemaMetadata } from "./validation-decorators.js";
import type { NewableFunction } from "./interfaces.js";

/**
 * Validation Service
 *
 * Handles validation of request parameters (body, query, params, headers)
 * using the configured validation adapters and smart field detection.
 */
export class ValidationService {
  private registry: ValidationRegistry;
  private smartDetector: SmartFieldDetector;
  private errorFormatter: HelpfulErrorFormatter;
  private enabled = false;
  private config: ValidationConfig = {};

  constructor() {
    this.registry = new ValidationRegistry();
    this.smartDetector = new SmartFieldDetector();
    this.errorFormatter = new HelpfulErrorFormatter();
  }

  /**
   * Enable the validation service with the given configuration
   * @param config - Validation configuration
   */
  enable(config: ValidationConfig = {}): void {
    this.enabled = true;
    this.config = config;
    this.registry.configure(config);

    // Register built-in adapters automatically
    this.registerBuiltInAdapters();

    // Set smart detection
    if (config.smartDetection !== undefined) {
      this.smartDetector.setEnabled(config.smartDetection);
    }
  }

  /**
   * Register built-in validation adapters
   * Additional adapters (Zod, Yup, Joi) can be registered via config.adapters
   * @private
   */
  private registerBuiltInAdapters(): void {
    // Register class-validator adapter (built-in)
    try {
      const classValidatorAdapter = new ClassValidatorAdapter();
      this.registry.register(classValidatorAdapter);
    } catch {
      // class-validator may not be installed
    }

    // Register user-provided adapters from config
    if (this.config.adapters) {
      for (const AdapterClass of this.config.adapters) {
        try {
          const adapter = new AdapterClass();
          this.registry.register(adapter);
        } catch {
          // Adapter instantiation failed
        }
      }
    }
  }

  /**
   * Disable the validation service
   */
  disable(): void {
    this.enabled = false;
  }

  /**
   * Check if validation is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get the validation registry for adapter management
   */
  getRegistry(): ValidationRegistry {
    return this.registry;
  }

  /**
   * Get the smart field detector
   */
  getSmartDetector(): SmartFieldDetector {
    return this.smartDetector;
  }

  /**
   * Get the error formatter
   */
  getErrorFormatter(): HelpfulErrorFormatter {
    return this.errorFormatter;
  }

  /**
   * Validate request parameters based on controller method metadata
   * @param req - Express request
   * @param res - Express response
   * @param controllerConstructor - Controller class constructor
   * @param methodName - Method name
   * @param args - Current parameter values
   * @returns Validated and transformed arguments, or null if validation failed (response sent)
   */
  async validateParameters(
    req: Request,
    res: Response,
    controllerConstructor: NewableFunction,
    methodName: string,
    args: Array<unknown>,
  ): Promise<Array<unknown> | null> {
    if (!this.enabled) {
      return args;
    }

    // Get validation metadata for the method
    let validationMetadata = getValidationMetadata(controllerConstructor, methodName);

    // TypeScript-First Auto-Detection: If no explicit validation schema,
    // try to infer from TypeScript type metadata
    if (validationMetadata.length === 0 && this.config.autoDetection !== false) {
      validationMetadata = await this.inferValidationFromTypes(
        controllerConstructor,
        methodName,
        args,
      );
    }

    if (validationMetadata.length === 0) {
      // No explicit validation - try smart detection if enabled
      if (this.smartDetector.isEnabled()) {
        const smartErrors = await this.validateWithSmartDetection(req);
        if (smartErrors.length > 0) {
          this.sendValidationError(res, smartErrors);
          return null;
        }
      }
      return args;
    }

    // Validate each parameter with schema
    const validatedArgs = [...args];
    const allErrors: Array<ValidationFieldError> = [];

    for (const metadata of validationMetadata) {
      const paramValue = this.getParameterValue(req, metadata);
      const result = await this.validateValue(paramValue, metadata);

      if (!result.success) {
        allErrors.push(...this.scopeErrorsToParam(result.errors || [], metadata));
      } else {
        // Update argument with validated/transformed data
        validatedArgs[metadata.index] = result.data;
      }
    }

    if (allErrors.length > 0) {
      this.sendValidationError(res, allErrors);
      return null;
    }

    return validatedArgs;
  }

  /**
   * Infer validation metadata from TypeScript type information
   * Uses reflect-metadata to get parameter types and automatically
   * detect class-validator DTOs or Zod schemas
   */
  private async inferValidationFromTypes(
    controllerConstructor: NewableFunction,
    methodName: string,
    args: Array<unknown>,
  ): Promise<Array<ValidationSchemaMetadata>> {
    const inferredMetadata: Array<ValidationSchemaMetadata> = [];

    for (let i = 0; i < args.length; i++) {
      const typeInfo = getParameterType(controllerConstructor.prototype, methodName, i);

      if (!typeInfo || !typeInfo.type) continue;

      const schemaType = detectSchemaType(typeInfo.type);

      // Only infer validation for class-validator DTOs or Zod schemas
      if (schemaType === "class-validator" || schemaType === "zod") {
        inferredMetadata.push({
          index: i,
          source: "body", // Default to body for inferred types
          schema: typeInfo.type as NewableFunction | object,
          inferred: true, // Mark as auto-inferred
        });
      } else if (schemaType === "class" && hasClassValidatorDecorators(typeInfo.type)) {
        // Double-check for class-validator decorators
        inferredMetadata.push({
          index: i,
          source: "body",
          schema: typeInfo.type as NewableFunction,
          inferred: true,
        });
      }
    }

    return inferredMetadata;
  }

  /**
   * Validate a single value against a schema
   */
  async validateValue(
    value: unknown,
    metadata: ValidationSchemaMetadata,
  ): Promise<ValidationResult> {
    if (!metadata.schema) {
      return { success: true, data: value };
    }

    const result = await this.registry.validate(value, metadata.schema, {
      ...this.config.defaultOptions,
      ...metadata.options,
    });

    // If validation passed and smart detection is enabled, also run smart detection
    if (
      result.success &&
      this.smartDetector.isEnabled() &&
      typeof result.data === "object" &&
      result.data !== null
    ) {
      const smartErrors = this.smartDetector.validateObject(result.data as Record<string, unknown>);
      if (smartErrors.length > 0) {
        return {
          success: false,
          errors: smartErrors,
        };
      }
    }

    return result;
  }

  /**
   * Get the parameter value from the request.
   * When the metadata targets a single named parameter (e.g.
   * `@validatedParam("id", uuidSchema)`), only that value is returned.
   */
  private getParameterValue(req: Request, metadata: ValidationSchemaMetadata): unknown {
    let container: unknown;

    switch (metadata.source) {
      case "body":
        container = req.body;
        break;
      case "query":
        container = req.query;
        break;
      case "params":
        container = req.params;
        break;
      case "headers":
        container = req.headers;
        break;
      default:
        return undefined;
    }

    if (metadata.paramName && container && typeof container === "object") {
      // HTTP header names are case-insensitive; Express lowercases them
      const key =
        metadata.source === "headers" ? metadata.paramName.toLowerCase() : metadata.paramName;
      return (container as Record<string, unknown>)[key];
    }

    return container;
  }

  /**
   * Rewrite error paths so single-parameter validation errors point to the
   * named parameter (e.g. "id") instead of an empty root path.
   */
  private scopeErrorsToParam(
    errors: Array<ValidationFieldError>,
    metadata: ValidationSchemaMetadata,
  ): Array<ValidationFieldError> {
    if (!metadata.paramName) {
      return errors;
    }

    return errors.map((error) => ({
      ...error,
      path: error.path ? `${metadata.paramName}.${error.path}` : metadata.paramName!,
    }));
  }

  /**
   * Validate request data using smart field detection
   */
  private async validateWithSmartDetection(req: Request): Promise<Array<ValidationFieldError>> {
    const errors: Array<ValidationFieldError> = [];

    // Validate body if present
    if (req.body && typeof req.body === "object") {
      const bodyErrors = this.smartDetector.validateObject(req.body as Record<string, unknown>);
      errors.push(...bodyErrors);
    }

    // Validate query if present
    if (req.query && typeof req.query === "object") {
      const queryErrors = this.smartDetector.validateObject(req.query as Record<string, unknown>);
      errors.push(...queryErrors);
    }

    return errors;
  }

  /**
   * Send validation error response
   */
  private sendValidationError(res: Response, errors: Array<ValidationFieldError>): void {
    const format = this.config.errorFormat || "helpful";
    const formattedErrors = this.errorFormatter.format(errors, format);

    res.status(400).json(formattedErrors);
  }
}
