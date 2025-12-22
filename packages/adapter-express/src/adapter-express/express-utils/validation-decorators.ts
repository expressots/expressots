/**
 * Validation Decorators
 * @module @expressots/adapter-express
 *
 * Enhanced parameter decorators with validation support.
 * These decorators extend the standard @body, @query, @param, @headers
 * to accept optional schema for automatic validation.
 */

import "reflect-metadata";
import { METADATA_KEY, PARAMETER_TYPE } from "./constants";
import type { ValidationOptions } from "@expressots/core";

/**
 * Metadata stored for validation
 */
export interface ValidationSchemaMetadata {
  /** Parameter index */
  index: number;
  /** Parameter source (body, query, params, headers) */
  source: "body" | "query" | "params" | "headers";
  /** Schema to validate against */
  schema?: unknown;
  /** Validation options */
  options?: ValidationOptions;
  /** Whether this metadata was auto-inferred from TypeScript types */
  inferred?: boolean;
}

/**
 * Schema type - can be a class constructor, Zod schema, or any other schema type
 */
export type SchemaType = (new (...args: Array<unknown>) => unknown) | object;

/**
 * Options for validated decorators
 */
export interface ValidatedDecoratorOptions extends ValidationOptions {
  /** Force specific adapter by name */
  adapter?: string;
}

/**
 * Create a validated parameter decorator
 * @param source - Parameter source type
 * @param parameterType - The PARAMETER_TYPE enum value
 */
function createValidatedParamDecorator(
  source: "body" | "query" | "params" | "headers",
  parameterType: PARAMETER_TYPE,
): {
  (schema?: SchemaType | ValidatedDecoratorOptions): ParameterDecorator;
  (nameOrSchema?: string | SchemaType | ValidatedDecoratorOptions): ParameterDecorator;
} {
  return function (
    nameOrSchema?: string | SchemaType | ValidatedDecoratorOptions,
  ): ParameterDecorator {
    return function (
      target: object,
      propertyKey: string | symbol | undefined,
      parameterIndex: number,
    ): void {
      let paramName: string | undefined;
      let schema: SchemaType | undefined;
      let options: ValidatedDecoratorOptions | undefined;

      // Parse arguments based on type
      if (nameOrSchema === undefined) {
        // No arguments - just inject the whole object
      } else if (typeof nameOrSchema === "string") {
        // String argument - it's a parameter name (for query, params, headers)
        paramName = nameOrSchema;
      } else if (typeof nameOrSchema === "function") {
        // Function (class constructor) - it's a schema
        schema = nameOrSchema;
      } else if (typeof nameOrSchema === "object") {
        // Object - could be schema (Zod, etc.) or options
        if ("group" in nameOrSchema || "partial" in nameOrSchema || "adapter" in nameOrSchema) {
          // It's options
          options = nameOrSchema as ValidatedDecoratorOptions;
        } else {
          // It's a schema (like Zod schema)
          schema = nameOrSchema as SchemaType;
        }
      }

      // Store basic parameter metadata using existing pattern
      const controller = target.constructor;
      let metadataList: Record<string, Array<{ index: number; injectRoot: boolean; parameterName?: string; type: PARAMETER_TYPE }>> = {};

      if (!Reflect.hasOwnMetadata(METADATA_KEY.controllerParameter, controller)) {
        Reflect.defineMetadata(METADATA_KEY.controllerParameter, metadataList, controller);
      } else {
        metadataList = Reflect.getOwnMetadata(METADATA_KEY.controllerParameter, controller);
      }

      const methodName = propertyKey as string;
      if (!metadataList[methodName]) {
        metadataList[methodName] = [];
      }

      metadataList[methodName].unshift({
        index: parameterIndex,
        injectRoot: paramName === undefined,
        parameterName: paramName,
        type: parameterType,
      });

      Reflect.defineMetadata(METADATA_KEY.controllerParameter, metadataList, controller);

      // Store validation schema metadata if provided
      if (schema) {
        const validationMetadata: ValidationSchemaMetadata = {
          index: parameterIndex,
          source,
          schema,
          options,
        };

        // Get existing validation metadata for this method
        let validationList: Array<ValidationSchemaMetadata> =
          Reflect.getOwnMetadata(METADATA_KEY.validationSchema, controller, propertyKey as string) || [];

        // Add new validation metadata
        validationList = [...validationList, validationMetadata];

        Reflect.defineMetadata(
          METADATA_KEY.validationSchema,
          validationList,
          controller,
          propertyKey as string,
        );
      }
    };
  };
}

/**
 * Enhanced body decorator with validation support
 *
 * @example
 * ```typescript
 * // Without validation (backward compatible)
 * @Post("/users")
 * createUser(@body() user: CreateUserDTO) {}
 *
 * // With class-validator schema
 * @Post("/users")
 * createUser(@body(CreateUserDTO) user: CreateUserDTO) {}
 *
 * // With Zod schema
 * const UserSchema = z.object({ email: z.string().email() });
 * @Post("/users")
 * createUser(@body(UserSchema) user: z.infer<typeof UserSchema>) {}
 *
 * // With validation options
 * @Post("/users")
 * createUser(@body({ group: "create", partial: false }) user: CreateUserDTO) {}
 * ```
 */
export const validatedBody = createValidatedParamDecorator("body", PARAMETER_TYPE.BODY);

/**
 * Enhanced query decorator with validation support
 *
 * @example
 * ```typescript
 * // Extract single query param (backward compatible)
 * @Get("/search")
 * search(@query("page") page: number) {}
 *
 * // Extract all query params with validation
 * @Get("/search")
 * search(@query(SearchQueryDTO) query: SearchQueryDTO) {}
 * ```
 */
export const validatedQuery = createValidatedParamDecorator("query", PARAMETER_TYPE.QUERY);

/**
 * Enhanced param decorator with validation support
 *
 * @example
 * ```typescript
 * // Extract single route param (backward compatible)
 * @Get("/:id")
 * getUser(@param("id") id: string) {}
 *
 * // Extract all route params with validation
 * @Get("/:userId/posts/:postId")
 * getPost(@param(RouteParamsDTO) params: RouteParamsDTO) {}
 * ```
 */
export const validatedParam = createValidatedParamDecorator("params", PARAMETER_TYPE.PARAMS);

/**
 * Enhanced headers decorator with validation support
 *
 * @example
 * ```typescript
 * // Extract single header (backward compatible)
 * @Get("/")
 * handle(@headers("authorization") auth: string) {}
 *
 * // Extract all headers with validation
 * @Get("/")
 * handle(@headers(RequiredHeadersDTO) headers: RequiredHeadersDTO) {}
 * ```
 */
export const validatedHeaders = createValidatedParamDecorator("headers", PARAMETER_TYPE.HEADERS);

/**
 * Get validation schema metadata for a method
 * @param target - Controller constructor
 * @param methodName - Method name
 * @returns Array of validation metadata
 */
export function getValidationMetadata(
  target: object,
  methodName: string,
): Array<ValidationSchemaMetadata> {
  return Reflect.getOwnMetadata(METADATA_KEY.validationSchema, target, methodName) || [];
}

/**
 * Check if a method has validation metadata
 * @param target - Controller constructor
 * @param methodName - Method name
 * @returns true if validation is configured
 */
export function hasValidationMetadata(target: object, methodName: string): boolean {
  const metadata = getValidationMetadata(target, methodName);
  return metadata.length > 0;
}

/**
 * @Validate decorator - marks a parameter for auto-validation
 * Can be used with any parameter decorator
 *
 * @example
 * ```typescript
 * @Post("/users")
 * createUser(
 *   @Validate(CreateUserDTO)
 *   @body() user: CreateUserDTO
 * ) {}
 * ```
 */
export function Validate<T = unknown>(
  schema: (new (...args: Array<unknown>) => T) | object,
  options?: ValidatedDecoratorOptions,
): ParameterDecorator {
  return function (
    target: object,
    propertyKey: string | symbol | undefined,
    parameterIndex: number,
  ): void {
    const controller = target.constructor;

    const validationMetadata: ValidationSchemaMetadata = {
      index: parameterIndex,
      source: "body", // Default, can be overridden by combining with @body/@query/etc
      schema,
      options,
    };

    // Get existing validation metadata for this method
    let validationList: Array<ValidationSchemaMetadata> =
      Reflect.getOwnMetadata(METADATA_KEY.validationSchema, controller, propertyKey as string) || [];

    // Add new validation metadata
    validationList = [...validationList, validationMetadata];

    Reflect.defineMetadata(
      METADATA_KEY.validationSchema,
      validationList,
      controller,
      propertyKey as string,
    );
  };
}

