// Unit tests for: ProviderRegistry.getFormattedView

import { interfaces } from "../../di/inversify";
import { ProviderRegistry } from "../provider-registry";
import { ProviderInfo, ProviderSource } from "../provider.interface";

describe("ProviderRegistry.getFormattedView() getFormattedView method", () => {
  let mockContainer: interfaces.Container;
  let registry: ProviderRegistry;

  beforeEach(() => {
    mockContainer = {
      isBound: jest.fn(),
      get: jest.fn(),
    } as any;
    registry = new ProviderRegistry(mockContainer);
    jest.clearAllMocks();
  });

  describe("Happy Path", () => {
    it("should return formatted view with default maxDisplay", () => {
      // Arrange
      jest.spyOn(registry, "getAll").mockReturnValue([]);
      jest.spyOn(registry, "getBuiltinProviders").mockReturnValue([]);
      jest.spyOn(registry, "getUserProviders").mockReturnValue([]);
      jest.spyOn(registry, "getExternalProviders").mockReturnValue([]);

      // Act
      const view = registry.getFormattedView();

      // Assert
      expect(view).toHaveProperty("entries");
      expect(view).toHaveProperty("total");
      expect(view).toHaveProperty("remaining");
      expect(view).toHaveProperty("bySource");
      expect(view.bySource).toHaveProperty("builtin");
      expect(view.bySource).toHaveProperty("user");
      expect(view.bySource).toHaveProperty("external");
    });

    it("should limit entries to maxDisplay", () => {
      // Arrange
      const providers: Array<ProviderInfo> = Array.from(
        { length: 10 },
        (_, i) => ({
          name: `Provider${i}`,
          scope: "Singleton",
          source: "user" as ProviderSource,
          capabilities: {
            hasBootstrap: false,
            hasShutdown: false,
            hasHealthCheck: false,
            hasMetrics: false,
            hasConfigurable: false,
          },
          target: class {},
        }),
      );
      jest.spyOn(registry, "getAll").mockReturnValue(providers);
      jest.spyOn(registry, "getBuiltinProviders").mockReturnValue([]);
      jest.spyOn(registry, "getUserProviders").mockReturnValue(providers);
      jest.spyOn(registry, "getExternalProviders").mockReturnValue([]);

      // Act
      const view = registry.getFormattedView(5);

      // Assert
      expect(view.entries.length).toBe(5);
      expect(view.total).toBe(10);
      expect(view.remaining).toBe(5);
    });

    it("should include lifecycle, health check, and metrics flags", () => {
      // Arrange
      const providers: Array<ProviderInfo> = [
        {
          name: "TestProvider",
          scope: "Singleton",
          source: "user" as ProviderSource,
          capabilities: {
            hasBootstrap: true,
            hasShutdown: true,
            hasHealthCheck: true,
            hasMetrics: true,
            hasConfigurable: false,
          },
          target: class {},
        },
      ];
      jest.spyOn(registry, "getAll").mockReturnValue(providers);
      jest.spyOn(registry, "getBuiltinProviders").mockReturnValue([]);
      jest.spyOn(registry, "getUserProviders").mockReturnValue(providers);
      jest.spyOn(registry, "getExternalProviders").mockReturnValue([]);

      // Act
      const view = registry.getFormattedView();

      // Assert
      expect(view.entries[0].hasLifecycle).toBe(true);
      expect(view.entries[0].hasHealthCheck).toBe(true);
      expect(view.entries[0].hasMetrics).toBe(true);
    });
  });
});

// End of unit tests for: ProviderRegistry.getFormattedView
