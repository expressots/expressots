import "reflect-metadata";
import { METADATA_KEY } from "./constants";
import type {
  CsvFormatOptions,
  XmlFormatOptions,
  YamlFormatOptions,
} from "@expressots/core";

/**
 * Accept decorator to specify which content types this route accepts for responses.
 * Used for content negotiation based on Accept header.
 * @param contentTypes - Array of accepted content types (e.g., ["application/json", "application/xml"])
 * @returns MethodDecorator
 * @example
 * ```typescript
 * @Accept("application/json", "application/xml")
 * @Get("/users")
 * getUsers() {
 *   return [{ id: 1, name: "John" }];
 * }
 * ```
 * @public API
 */
export function Accept(...contentTypes: Array<string>): MethodDecorator {
  return (target: object, key: string | symbol): void => {
    Reflect.defineMetadata(METADATA_KEY.accept, contentTypes, target, key);
  };
}

/**
 * Consumes decorator to specify which content types this route consumes for requests.
 * Used for content negotiation based on Content-Type header.
 * @param contentTypes - Array of consumed content types (e.g., ["application/json", "application/xml"])
 * @returns MethodDecorator
 * @example
 * ```typescript
 * @Consumes("application/json", "application/xml")
 * @Post("/users")
 * createUser(@body() user: UserDto) {
 *   return this.userService.create(user);
 * }
 * ```
 * @public API
 */
export function Consumes(...contentTypes: Array<string>): MethodDecorator {
  return (target: object, key: string | symbol): void => {
    Reflect.defineMetadata(METADATA_KEY.consumes, contentTypes, target, key);
  };
}

/**
 * Produces decorator to specify which content types this route produces for responses.
 * Alias for @Accept() decorator.
 * @param contentTypes - Array of produced content types
 * @returns MethodDecorator
 * @public API
 */
export function Produces(...contentTypes: Array<string>): MethodDecorator {
  return Accept(...contentTypes);
}

/**
 * CsvOptions decorator to configure CSV formatting options for a route.
 * @param options - CSV formatting options
 * @returns MethodDecorator
 * @example
 * ```typescript
 * @CsvOptions({ fields: ["id", "name"], includeHeaders: true })
 * @Get("/users")
 * getUsers() {
 *   return [{ id: 1, name: "John", email: "john@example.com" }];
 * }
 * ```
 * @public API
 */
export function CsvOptions(options: CsvFormatOptions): MethodDecorator {
  return (target: object, key: string | symbol): void => {
    Reflect.defineMetadata(METADATA_KEY.csvOptions, options, target, key);
  };
}

/**
 * XmlOptions decorator to configure XML formatting options for a route.
 * @param options - XML formatting options
 * @returns MethodDecorator
 * @example
 * ```typescript
 * @XmlOptions({ rootElement: "users", itemElement: "user", prettyPrint: true })
 * @Get("/users")
 * getUsers() {
 *   return [{ id: 1, name: "John" }];
 * }
 * ```
 * @public API
 */
export function XmlOptions(options: XmlFormatOptions): MethodDecorator {
  return (target: object, key: string | symbol): void => {
    Reflect.defineMetadata(METADATA_KEY.xmlOptions, options, target, key);
  };
}

/**
 * YamlOptions decorator to configure YAML formatting options for a route.
 * @param options - YAML formatting options
 * @returns MethodDecorator
 * @public API
 */
export function YamlOptions(options: YamlFormatOptions): MethodDecorator {
  return (target: object, key: string | symbol): void => {
    Reflect.defineMetadata(METADATA_KEY.yamlOptions, options, target, key);
  };
}

/**
 * StreamResponse decorator to indicate that the response should be streamed.
 * Useful for large datasets.
 * @returns MethodDecorator
 * @example
 * ```typescript
 * @StreamResponse()
 * @Get("/large-dataset")
 * getLargeDataset() {
 *   return this.dataService.streamLargeDataset(); // Returns async iterator
 * }
 * ```
 * @public API
 */
export function StreamResponse(): MethodDecorator {
  return (target: object, key: string | symbol): void => {
    Reflect.defineMetadata(METADATA_KEY.streamResponse, true, target, key);
  };
}

