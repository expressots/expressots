/**
 * TypeScript Type Inference for Auto-Validation
 * @module @expressots/core/validation
 *
 * This module provides utilities for inferring validation schemas
 * from TypeScript types using reflect-metadata.
 */

import "reflect-metadata";
import { nodeRequire } from "../../utils/node-require.js";

/**
 * Inferred type information from TypeScript metadata
 */
export interface InferredTypeInfo {
  /** The TypeScript type constructor (String, Number, Boolean, Array, Object, or custom class) */
  type: unknown;
  /** Whether the type is an array */
  isArray: boolean;
  /** Whether the type is optional (undefined union) */
  isOptional: boolean;
  /** The parameter index */
  index: number;
  /** Property names and their types (for objects) */
  properties?: Map<string, InferredPropertyInfo>;
}

/**
 * Information about an inferred property
 */
export interface InferredPropertyInfo {
  /** Property name */
  name: string;
  /** Property type constructor */
  type: unknown;
  /** Whether the property is optional */
  isOptional: boolean;
  /** Whether the property is an array */
  isArray: boolean;
}

/**
 * Get parameter type information from TypeScript metadata
 * @param target - The class prototype
 * @param methodName - The method name
 * @param parameterIndex - The parameter index
 * @returns Inferred type information or undefined
 */
export function getParameterType(
  target: object,
  methodName: string | symbol,
  parameterIndex: number,
): InferredTypeInfo | undefined {
  const paramTypes = Reflect.getMetadata(
    "design:paramtypes",
    target,
    methodName,
  );

  if (!paramTypes || parameterIndex >= paramTypes.length) {
    return undefined;
  }

  const type = paramTypes[parameterIndex];

  return {
    type,
    isArray: type === Array,
    isOptional: false, // TypeScript doesn't emit optional info in paramtypes
    index: parameterIndex,
    properties: getClassProperties(type),
  };
}

/**
 * Get all parameter types for a method
 * @param target - The class prototype
 * @param methodName - The method name
 * @returns Array of inferred type information
 */
export function getAllParameterTypes(
  target: object,
  methodName: string | symbol,
): Array<InferredTypeInfo> {
  const paramTypes = Reflect.getMetadata(
    "design:paramtypes",
    target,
    methodName,
  );

  if (!paramTypes) {
    return [];
  }

  return paramTypes.map((type: unknown, index: number) => ({
    type,
    isArray: type === Array,
    isOptional: false,
    index,
    properties: getClassProperties(type),
  }));
}

/**
 * Get property type information for a class
 * @param classConstructor - The class constructor
 * @returns Map of property names to their type info, or undefined if not a class
 */
export function getClassProperties(
  classConstructor: unknown,
): Map<string, InferredPropertyInfo> | undefined {
  if (typeof classConstructor !== "function") {
    return undefined;
  }

  // Skip built-in types
  if (
    classConstructor === String ||
    classConstructor === Number ||
    classConstructor === Boolean ||
    classConstructor === Array ||
    classConstructor === Object ||
    classConstructor === Date
  ) {
    return undefined;
  }

  const properties = new Map<string, InferredPropertyInfo>();

  // Try to create an instance to get property names
  try {
    // Check if it has any decorated properties using reflect-metadata
    const instance = Object.create(classConstructor.prototype);
    const propertyNames = Object.getOwnPropertyNames(instance);

    for (const name of propertyNames) {
      const propertyType = Reflect.getMetadata(
        "design:type",
        classConstructor.prototype,
        name,
      );

      if (propertyType) {
        properties.set(name, {
          name,
          type: propertyType,
          isOptional: false,
          isArray: propertyType === Array,
        });
      }
    }

    // Also check the class prototype for decorated properties
    const prototypePropertyNames = Object.getOwnPropertyNames(
      classConstructor.prototype,
    );
    for (const name of prototypePropertyNames) {
      if (name === "constructor") continue;

      const propertyType = Reflect.getMetadata(
        "design:type",
        classConstructor.prototype,
        name,
      );

      if (propertyType && !properties.has(name)) {
        properties.set(name, {
          name,
          type: propertyType,
          isOptional: false,
          isArray: propertyType === Array,
        });
      }
    }
  } catch {
    // Failed to analyze class, return empty map
  }

  return properties.size > 0 ? properties : undefined;
}

/**
 * Check if a type has class-validator decorators
 * @param classConstructor - The class constructor to check
 * @returns true if the class has validation decorators
 */
export function hasClassValidatorDecorators(
  classConstructor: unknown,
): boolean {
  if (typeof classConstructor !== "function") {
    return false;
  }

  try {
    // Check for class-validator metadata storage
    const cv = nodeRequire<{
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getMetadataStorage?: () => any;
    }>("class-validator");
    const metadataStorage = cv.getMetadataStorage?.();

    if (metadataStorage) {
      const targetMetadata = metadataStorage.getTargetValidationMetadatas(
        classConstructor,
        "",
        false,
        false,
      );
      return targetMetadata && targetMetadata.length > 0;
    }
  } catch {
    // class-validator not installed or error accessing metadata
  }

  // Fallback: check for common class-validator metadata keys
  const metadataKeys = Reflect.getMetadataKeys(classConstructor.prototype);
  return metadataKeys.some(
    (key) =>
      typeof key === "string" &&
      (key.includes("validation") || key.includes("class-validator")),
  );
}

/**
 * Check if a value is a Zod schema
 * @param value - The value to check
 * @returns true if the value is a Zod schema
 */
export function isZodSchema(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  // Zod schemas have a _def property with typeName
  if (typeof value === "object" && "_def" in value) {
    const def = (value as { _def: unknown })._def;
    return typeof def === "object" && def !== null && "typeName" in def;
  }

  // Check for ZodType inheritance
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const z = nodeRequire<{ ZodType: any }>("zod");
    return value instanceof z.ZodType;
  } catch {
    // Zod not installed
    return false;
  }
}

/**
 * Check if a value is a class constructor
 * @param value - The value to check
 * @returns true if the value is a class constructor
 */
export function isClassConstructor(
  value: unknown,
): value is new (...args: Array<unknown>) => unknown {
  return (
    typeof value === "function" &&
    value.prototype !== undefined &&
    value.prototype.constructor === value
  );
}

/**
 * Determine the schema type from a value
 * @param value - The value to analyze
 * @returns The detected schema type
 */
export function detectSchemaType(
  value: unknown,
): "class-validator" | "zod" | "class" | "unknown" {
  if (isClassConstructor(value)) {
    if (hasClassValidatorDecorators(value)) {
      return "class-validator";
    }
    return "class";
  }

  if (isZodSchema(value)) {
    return "zod";
  }

  return "unknown";
}
