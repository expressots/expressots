// Unit tests for: MetricsCollector

import "reflect-metadata";
import { MetricsCollector } from "../logger.metrics-collector";
import { interfaces } from "../../../di/inversify";
import { GuardRegistry } from "../../../authorization/guard-registry";
import { ExceptionFilterRegistry } from "../../../error/exception-filter-registry";
import { METADATA_KEY } from "../../../di/binding-decorator/constants";

describe("MetricsCollector", () => {
  let mockContainer: interfaces.Container;
  let mockOptions: Parameters<typeof MetricsCollector.collect>[1];

  beforeEach(() => {
    mockContainer = {
      isBound: jest.fn(),
    } as any;

    mockOptions = {
      getControllersFromMetadata: jest.fn().mockReturnValue([]),
      getControllersFromContainer: jest.fn().mockReturnValue([]),
      getControllerMethodMetadata: jest.fn(),
      getMiddlewareCount: jest.fn().mockReturnValue(0),
      hasContentNegotiation: jest.fn().mockReturnValue(false),
      hasSmartValidation: jest.fn().mockReturnValue(false),
      hasAuthorization: jest.fn().mockReturnValue(false),
      hasExceptionFilters: jest.fn().mockReturnValue(false),
    };

    // Reset metadata
    Reflect.defineMetadata(METADATA_KEY.provide, [], Reflect);
    Reflect.defineMetadata("guard", [], Reflect);
    Reflect.defineMetadata("exception-filter", [], Reflect);
  });

  describe("collect()", () => {
    it("should collect basic metrics with empty application", () => {
      // Act
      const result = MetricsCollector.collect(mockContainer, mockOptions);

      // Assert
      expect(result.metrics).toEqual({
        controllers: 0,
        providers: 0,
        middleware: 0,
        guards: 0,
        filters: 0,
        routes: 0,
      });
      expect(result.features).toEqual({
        contentNegotiation: false,
        smartValidation: false,
        authorization: false,
        exceptionFilters: false,
        gracefulShutdown: true,
        lifecycleHooks: false,
        customScopes: false,
        apiVersioning: false,
        globalRoutePrefix: false,
        errorHandler: false,
        requestLogging: false,
      });
    });

    it("should count controllers from metadata", () => {
      // Arrange
      mockOptions.getControllersFromMetadata = jest
        .fn()
        .mockReturnValue([{}, {}, {}]);

      // Act
      const result = MetricsCollector.collect(mockContainer, mockOptions);

      // Assert
      expect(result.metrics.controllers).toBe(3);
    });

    it("should count routes from controller methods", () => {
      // Arrange
      class TestController {
        method1() {}
        method2() {}
      }

      mockOptions.getControllersFromMetadata = jest
        .fn()
        .mockReturnValue([TestController]);
      mockOptions.getControllersFromContainer = jest
        .fn()
        .mockReturnValue([new TestController()]);
      mockOptions.getControllerMethodMetadata = jest.fn().mockReturnValue([
        { method: "GET", path: "/test1" },
        { method: "POST", path: "/test2" },
      ]);

      // Act
      const result = MetricsCollector.collect(mockContainer, mockOptions);

      // Assert
      expect(result.metrics.routes).toBe(2);
    });

    it("should fallback to estimated routes when controller iteration fails", () => {
      // Arrange
      mockOptions.getControllersFromMetadata = jest
        .fn()
        .mockReturnValue([{}, {}]);
      mockOptions.getControllersFromContainer = jest
        .fn()
        .mockImplementation(() => {
          throw new Error("Container error");
        });

      // Act
      const result = MetricsCollector.collect(mockContainer, mockOptions);

      // Assert
      // Should estimate 4 routes per controller = 8 routes
      expect(result.metrics.routes).toBe(8);
    });

    it("should count providers from metadata", () => {
      // Arrange
      class Provider1 {}
      class Provider2 {}
      Reflect.defineMetadata(
        METADATA_KEY.provide,
        [{ implementationType: Provider1 }, { implementationType: Provider2 }],
        Reflect,
      );

      // Act
      const result = MetricsCollector.collect(mockContainer, mockOptions);

      // Assert
      expect(result.metrics.providers).toBe(2);
    });

    it("should count bootstrap providers", () => {
      // Arrange
      class BootstrapProvider {
        bootstrap() {}
      }

      Reflect.defineMetadata(
        METADATA_KEY.provide,
        [{ implementationType: BootstrapProvider }],
        Reflect,
      );

      // Act
      const result = MetricsCollector.collect(mockContainer, mockOptions);

      // Assert
      expect(result.metrics.bootstrapProviders).toBe(1);
    });

    it("should count shutdown providers", () => {
      // Arrange
      class ShutdownProvider {
        shutdown() {}
      }

      Reflect.defineMetadata(
        METADATA_KEY.provide,
        [{ implementationType: ShutdownProvider }],
        Reflect,
      );

      // Act
      const result = MetricsCollector.collect(mockContainer, mockOptions);

      // Assert
      expect(result.metrics.shutdownProviders).toBe(1);
    });

    it("should count providers with both bootstrap and shutdown", () => {
      // Arrange
      class LifecycleProvider {
        bootstrap() {}
        shutdown() {}
      }

      Reflect.defineMetadata(
        METADATA_KEY.provide,
        [{ implementationType: LifecycleProvider }],
        Reflect,
      );

      // Act
      const result = MetricsCollector.collect(mockContainer, mockOptions);

      // Assert
      expect(result.metrics.bootstrapProviders).toBe(1);
      expect(result.metrics.shutdownProviders).toBe(1);
    });

    it("should not include bootstrap/shutdown count if zero", () => {
      // Act
      const result = MetricsCollector.collect(mockContainer, mockOptions);

      // Assert
      expect(result.metrics.bootstrapProviders).toBeUndefined();
      expect(result.metrics.shutdownProviders).toBeUndefined();
    });

    it("should count middleware", () => {
      // Arrange
      mockOptions.getMiddlewareCount = jest.fn().mockReturnValue(5);

      // Act
      const result = MetricsCollector.collect(mockContainer, mockOptions);

      // Assert
      expect(result.metrics.middleware).toBe(5);
    });

    it("should count guards when GuardRegistry is bound", () => {
      // Arrange
      mockContainer.isBound = jest
        .fn()
        .mockImplementation((serviceIdentifier) => {
          return serviceIdentifier === GuardRegistry;
        });
      Reflect.defineMetadata("guard", [{}, {}, {}], Reflect);

      // Act
      const result = MetricsCollector.collect(mockContainer, mockOptions);

      // Assert
      expect(result.metrics.guards).toBe(3);
    });

    it("should not count guards when GuardRegistry is not bound", () => {
      // Arrange
      mockContainer.isBound = jest.fn().mockReturnValue(false);
      Reflect.defineMetadata("guard", [{}, {}], Reflect);

      // Act
      const result = MetricsCollector.collect(mockContainer, mockOptions);

      // Assert
      expect(result.metrics.guards).toBe(0);
    });

    it("should handle guard counting errors gracefully", () => {
      // Arrange
      mockContainer.isBound = jest.fn().mockImplementation(() => {
        throw new Error("Container error");
      });

      // Act
      const result = MetricsCollector.collect(mockContainer, mockOptions);

      // Assert
      expect(result.metrics.guards).toBe(0);
    });

    it("should count exception filters when ExceptionFilterRegistry is bound", () => {
      // Arrange
      mockContainer.isBound = jest
        .fn()
        .mockImplementation((serviceIdentifier) => {
          return serviceIdentifier === ExceptionFilterRegistry;
        });
      Reflect.defineMetadata("exception-filter", [{}, {}, {}, {}], Reflect);

      // Act
      const result = MetricsCollector.collect(mockContainer, mockOptions);

      // Assert
      expect(result.metrics.filters).toBe(4);
    });

    it("should not count filters when ExceptionFilterRegistry is not bound", () => {
      // Arrange
      mockContainer.isBound = jest.fn().mockReturnValue(false);
      Reflect.defineMetadata("exception-filter", [{}], Reflect);

      // Act
      const result = MetricsCollector.collect(mockContainer, mockOptions);

      // Assert
      expect(result.metrics.filters).toBe(0);
    });

    it("should handle filter counting errors gracefully", () => {
      // Arrange
      mockContainer.isBound = jest.fn().mockImplementation(() => {
        throw new Error("Container error");
      });

      // Act
      const result = MetricsCollector.collect(mockContainer, mockOptions);

      // Assert
      expect(result.metrics.filters).toBe(0);
    });

    it("should detect features status", () => {
      // Arrange
      mockOptions.hasContentNegotiation = jest.fn().mockReturnValue(true);
      mockOptions.hasSmartValidation = jest.fn().mockReturnValue(true);
      mockOptions.hasAuthorization = jest.fn().mockReturnValue(true);
      mockOptions.hasExceptionFilters = jest.fn().mockReturnValue(true);
      mockOptions.hasApiVersioning = jest.fn().mockReturnValue(true);
      mockOptions.hasGlobalRoutePrefix = jest.fn().mockReturnValue(true);
      mockOptions.hasErrorHandler = jest.fn().mockReturnValue(true);
      mockOptions.hasRequestLogging = jest.fn().mockReturnValue(true);

      class LifecycleProvider {
        bootstrap() {}
      }
      Reflect.defineMetadata(
        METADATA_KEY.provide,
        [{ implementationType: LifecycleProvider }],
        Reflect,
      );

      // Act
      const result = MetricsCollector.collect(mockContainer, mockOptions);

      // Assert
      expect(result.features).toEqual({
        contentNegotiation: true,
        smartValidation: true,
        authorization: true,
        exceptionFilters: true,
        gracefulShutdown: true,
        lifecycleHooks: true,
        customScopes: false,
        apiVersioning: true,
        globalRoutePrefix: true,
        errorHandler: true,
        requestLogging: true,
      });
    });

    it("should detect lifecycle hooks from bootstrap providers", () => {
      // Arrange
      class BootstrapProvider {
        bootstrap() {}
      }
      Reflect.defineMetadata(
        METADATA_KEY.provide,
        [{ implementationType: BootstrapProvider }],
        Reflect,
      );

      // Act
      const result = MetricsCollector.collect(mockContainer, mockOptions);

      // Assert
      expect(result.features.lifecycleHooks).toBe(true);
    });

    it("should detect lifecycle hooks from shutdown providers", () => {
      // Arrange
      class ShutdownProvider {
        shutdown() {}
      }
      Reflect.defineMetadata(
        METADATA_KEY.provide,
        [{ implementationType: ShutdownProvider }],
        Reflect,
      );

      // Act
      const result = MetricsCollector.collect(mockContainer, mockOptions);

      // Assert
      expect(result.features.lifecycleHooks).toBe(true);
    });

    it("should handle providers without prototype", () => {
      // Arrange
      const providerWithoutPrototype = {} as any;
      Reflect.defineMetadata(
        METADATA_KEY.provide,
        [{ implementationType: providerWithoutPrototype }],
        Reflect,
      );

      // Act
      const result = MetricsCollector.collect(mockContainer, mockOptions);

      // Assert
      expect(result.metrics.bootstrapProviders).toBeUndefined();
      expect(result.metrics.shutdownProviders).toBeUndefined();
    });

    it("should handle multiple controllers with routes", () => {
      // Arrange
      class Controller1 {
        method1() {}
      }
      class Controller2 {
        method1() {}
        method2() {}
      }

      mockOptions.getControllersFromMetadata = jest
        .fn()
        .mockReturnValue([Controller1, Controller2]);
      mockOptions.getControllersFromContainer = jest
        .fn()
        .mockReturnValue([new Controller1(), new Controller2()]);
      mockOptions.getControllerMethodMetadata = jest
        .fn()
        .mockImplementation((constructor) => {
          if (constructor === Controller1) {
            return [{ method: "GET", path: "/c1" }];
          }
          if (constructor === Controller2) {
            return [
              { method: "GET", path: "/c2/1" },
              { method: "POST", path: "/c2/2" },
            ];
          }
          return undefined;
        });

      // Act
      const result = MetricsCollector.collect(mockContainer, mockOptions);

      // Assert
      expect(result.metrics.routes).toBe(3);
    });

    it("should handle controllers without method metadata", () => {
      // Arrange
      class ControllerWithoutMethods {}

      mockOptions.getControllersFromMetadata = jest
        .fn()
        .mockReturnValue([ControllerWithoutMethods]);
      mockOptions.getControllersFromContainer = jest
        .fn()
        .mockReturnValue([new ControllerWithoutMethods()]);
      mockOptions.getControllerMethodMetadata = jest
        .fn()
        .mockReturnValue(undefined);

      // Act
      const result = MetricsCollector.collect(mockContainer, mockOptions);

      // Assert
      expect(result.metrics.routes).toBe(0);
    });
  });
});
