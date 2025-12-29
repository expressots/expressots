/**
 * Smart Mocking System
 *
 * @module testing
 *
 * Provides intelligent mocking with auto-discovery of dependencies
 * and TypeScript auto-completion for all mock methods.
 *
 * @example
 * ```typescript
 * const { service, mocks } = mockProvider(UserService, {
 *   mocks: {
 *     UserRepository: {
 *       findById: jest.fn().mockResolvedValue(mockUser)
 *     }
 *   }
 * });
 *
 * await service.getUser("123");
 * expect(mocks.UserRepository.findById).toHaveBeenCalledWith("123");
 * ```
 */

import { Container, BindingScopeEnum } from "../di/inversify";
import {
  MockProviderOptions,
  MockProviderResult,
  MockDependencies,
  ServiceIdentifier,
  MockFunction,
} from "./testing.interfaces";

/**
 * Type for detecting the test framework in use.
 */
type TestFramework = "jest" | "vitest" | "unknown";

/**
 * Detect the current test framework.
 */
function detectTestFramework(): TestFramework {
  // Check for Jest
  if (typeof jest !== "undefined" && typeof jest.fn === "function") {
    return "jest";
  }
  
  // Check for Vitest
  type GlobalWithVitest = typeof globalThis & { 
    vi?: { fn: () => MockFunction };
  };
  const globalWithVi = globalThis as GlobalWithVitest;
  if (typeof globalWithVi.vi !== "undefined" && 
      typeof globalWithVi.vi.fn === "function") {
    return "vitest";
  }
  
  return "unknown";
}

/**
 * Create a mock function compatible with Jest/Vitest.
 */
function createMockFunction<A extends Array<unknown> = Array<unknown>, R = unknown>(
  framework: TestFramework
): MockFunction<A, R> {
  if (framework === "jest" && typeof jest !== "undefined") {
    return jest.fn() as unknown as MockFunction<A, R>;
  }
  
  type GlobalWithVitest = typeof globalThis & { 
    vi?: { fn: () => MockFunction<A, R> };
  };
  const globalWithVi = globalThis as GlobalWithVitest;
  if (framework === "vitest" && typeof globalWithVi.vi !== "undefined") {
    return globalWithVi.vi.fn() as MockFunction<A, R>;
  }
  
  // Fallback: Create a basic mock function
  const calls: Array<A> = [];
  const results: Array<{ type: "return" | "throw"; value: unknown }> = [];
  let returnValue: R | undefined;
  let resolvedValue: Awaited<R> | undefined;
  let rejectedValue: unknown;
  let implementation: ((...args: A) => R) | undefined;
  
  const mockFn = ((...args: A): R => {
    calls.push(args);
    
    if (implementation) {
      try {
        const result = implementation(...args);
        results.push({ type: "return", value: result });
        return result;
      } catch (error) {
        results.push({ type: "throw", value: error });
        throw error;
      }
    }
    
    if (rejectedValue !== undefined) {
      results.push({ type: "throw", value: rejectedValue });
      return Promise.reject(rejectedValue) as R;
    }
    
    if (resolvedValue !== undefined) {
      results.push({ type: "return", value: resolvedValue });
      return Promise.resolve(resolvedValue) as R;
    }
    
    results.push({ type: "return", value: returnValue });
    return returnValue as R;
  }) as MockFunction<A, R>;
  
  mockFn.mockReturnValue = (value: R): MockFunction<A, R> => {
    returnValue = value;
    return mockFn;
  };
  
  mockFn.mockResolvedValue = (value: Awaited<R>): MockFunction<A, R> => {
    resolvedValue = value;
    return mockFn;
  };
  
  mockFn.mockRejectedValue = (error: unknown): MockFunction<A, R> => {
    rejectedValue = error;
    return mockFn;
  };
  
  mockFn.mockImplementation = (fn: (...args: A) => R): MockFunction<A, R> => {
    implementation = fn;
    return mockFn;
  };
  
  mockFn.mockClear = (): void => {
    calls.length = 0;
    results.length = 0;
  };
  
  mockFn.mockReset = (): void => {
    mockFn.mockClear();
    returnValue = undefined;
    resolvedValue = undefined;
    rejectedValue = undefined;
    implementation = undefined;
  };
  
  mockFn.mock = { calls, results };
  
  return mockFn;
}

/**
 * Create a mock object for a class, auto-mocking all methods.
 */
function createAutoMock<T>(
  classRef: new (...args: Array<unknown>) => T,
  framework: TestFramework
): Partial<T> {
  const mock: Partial<T> = {};
  
  // Get all method names from the prototype
  const prototype = classRef.prototype;
  const propertyNames = Object.getOwnPropertyNames(prototype);
  
  for (const name of propertyNames) {
    if (name === "constructor") continue;
    
    const descriptor = Object.getOwnPropertyDescriptor(prototype, name);
    if (descriptor && typeof descriptor.value === "function") {
      (mock as Record<string, unknown>)[name] = createMockFunction(framework);
    }
  }
  
  return mock;
}

/**
 * Extract dependency types from a class using reflection.
 * This uses the Inversify metadata to get constructor parameter types.
 */
function extractDependencies(
  classRef: new (...args: Array<unknown>) => unknown
): Array<ServiceIdentifier> {
  const dependencies: Array<ServiceIdentifier> = [];
  
  // Try to get parameter types from reflect-metadata
  const paramTypes = Reflect.getMetadata("design:paramtypes", classRef);
  
  if (paramTypes && Array.isArray(paramTypes)) {
    for (const type of paramTypes) {
      if (type && typeof type === "function") {
        dependencies.push(type);
      }
    }
  }
  
  return dependencies;
}

/**
 * Mock a provider with smart dependency discovery and auto-completion.
 *
 * @layer public
 * @audience application-developers
 * @concept testing
 *
 * This function provides:
 * - Auto-discovery of dependencies
 * - TypeScript auto-completion for mock methods
 * - Automatic mock creation for unspecified dependencies
 * - Easy mock verification
 *
 * @param serviceClass - The service class to mock
 * @param options - Mock options including dependency mocks
 * @returns Mock result with service, mocks, and utilities
 *
 * @example
 * ```typescript
 * // Basic usage
 * const { service, mocks } = mockProvider(UserService, {
 *   mocks: {
 *     UserRepository: {
 *       findById: jest.fn().mockResolvedValue(mockUser)
 *     }
 *   }
 * });
 *
 * // With auto-mocking
 * const { service, mocks } = mockProvider(UserService, {
 *   autoMock: true  // All dependencies are auto-mocked
 * });
 *
 * // Test the service
 * await service.getUser("123");
 * expect(mocks.UserRepository.findById).toHaveBeenCalledWith("123");
 * ```
 */
export function mockProvider<T>(
  serviceClass: new (...args: Array<unknown>) => T,
  options: MockProviderOptions<T> = {}
): MockProviderResult<T> {
  const {
    mocks = {} as MockDependencies<T>,
    additionalBindings = [],
    autoMock = true,
    mockFramework = "jest",
  } = options;
  
  // Detect test framework
  const framework = detectTestFramework();
  const effectiveFramework = framework !== "unknown" ? framework : mockFramework;
  
  // Create a test container
  const container = new Container({
    defaultScope: BindingScopeEnum.Singleton,
  });
  
  // Extract dependencies from the service class
  const dependencies = extractDependencies(serviceClass);
  
  // Build mock objects for dependencies
  const mockObjects: Record<string, unknown> = {};
  
  for (let i = 0; i < dependencies.length; i++) {
    const dep = dependencies[i];
    const depName = typeof dep === "function" ? dep.name : String(dep);
    
    // Check if user provided a mock
    const userMock = (mocks as Record<string, unknown>)[depName];
    
    if (userMock) {
      // Use user-provided mock
      mockObjects[depName] = userMock;
      container.bind(dep).toConstantValue(userMock);
    } else if (autoMock && typeof dep === "function") {
      // Auto-mock the dependency
      const autoMocked = createAutoMock(dep as new (...args: Array<unknown>) => unknown, effectiveFramework);
      mockObjects[depName] = autoMocked;
      container.bind(dep).toConstantValue(autoMocked);
    }
  }
  
  // Apply additional bindings
  for (const binding of additionalBindings) {
    let value: unknown;
    if (binding.useValue !== undefined) {
      value = binding.useValue;
    } else if (binding.useFactory) {
      value = binding.useFactory();
    } else if (binding.useClass) {
      value = new binding.useClass();
    }
    
    if (value !== undefined) {
      container.bind(binding.provide as symbol | string).toConstantValue(value);
    }
  }
  
  // Bind and resolve the service
  container.bind(serviceClass).toSelf();
  const service = container.get<T>(serviceClass);
  
  // Create utility functions
  const resetAllMocks = (): void => {
    for (const mockObj of Object.values(mockObjects)) {
      if (mockObj && typeof mockObj === "object") {
        for (const fn of Object.values(mockObj as Record<string, unknown>)) {
          if (typeof fn === "function" && "mockReset" in fn) {
            (fn as MockFunction).mockReset();
          }
        }
      }
    }
  };
  
  const clearAllMocks = (): void => {
    for (const mockObj of Object.values(mockObjects)) {
      if (mockObj && typeof mockObj === "object") {
        for (const fn of Object.values(mockObj as Record<string, unknown>)) {
          if (typeof fn === "function" && "mockClear" in fn) {
            (fn as MockFunction).mockClear();
          }
        }
      }
    }
  };
  
  const verifyAllMocks = (): void => {
    // Basic verification - check that all mocks were called at least once
    // For more sophisticated verification, use Jest/Vitest expect
    for (const [name, mockObj] of Object.entries(mockObjects)) {
      if (mockObj && typeof mockObj === "object") {
        for (const [fnName, fn] of Object.entries(mockObj as Record<string, unknown>)) {
          if (typeof fn === "function" && "mock" in fn) {
            const mockFn = fn as MockFunction;
            if (mockFn.mock.calls.length === 0) {
              console.warn(`Warning: ${name}.${fnName} was never called`);
            }
          }
        }
      }
    }
  };
  
  return {
    service,
    mocks: mockObjects as MockDependencies<T>,
    container,
    resetAllMocks,
    clearAllMocks,
    verifyAllMocks,
  };
}

/**
 * Create a standalone mock function.
 *
 * @example
 * ```typescript
 * const mockFn = createMock<[string], Promise<User>>();
 * mockFn.mockResolvedValue({ id: "123", name: "John" });
 * ```
 */
export function createMock<A extends Array<unknown> = Array<unknown>, R = unknown>(): MockFunction<A, R> {
  return createMockFunction<A, R>(detectTestFramework());
}

/**
 * Create a mock object from a class.
 *
 * @example
 * ```typescript
 * const mockRepo = createMockObject(UserRepository);
 * mockRepo.findById.mockResolvedValue(mockUser);
 * ```
 */
export function createMockObject<T>(
  classRef: new (...args: Array<unknown>) => T
): MockDependencies<typeof classRef> {
  return createAutoMock(classRef, detectTestFramework()) as MockDependencies<typeof classRef>;
}

/**
 * Spy on a method of an object.
 *
 * @example
 * ```typescript
 * const spy = spyOn(userService, "getUser");
 * await userService.getUser("123");
 * expect(spy).toHaveBeenCalledWith("123");
 * ```
 */
export function spyOn<T extends object, K extends keyof T>(
  obj: T,
  method: K
): MockFunction {
  const framework = detectTestFramework();
  const original = obj[method];
  
  if (typeof original !== "function") {
    throw new Error(`${String(method)} is not a function`);
  }
  
  const mockFn = createMockFunction(framework);
  mockFn.mockImplementation((...args: Array<unknown>): unknown => {
    return (original as (...args: Array<unknown>) => unknown).apply(obj, args);
  });
  
  (obj as Record<string | symbol, unknown>)[method as string | symbol] = mockFn;
  
  // Add restore method
  const mockFnWithRestore = mockFn as MockFunction & { mockRestore: () => void };
  mockFnWithRestore.mockRestore = (): void => {
    (obj as Record<string | symbol, unknown>)[method as string | symbol] = original;
  };
  
  return mockFnWithRestore;
}

