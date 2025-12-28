// Unit tests for: ProviderRegistry.collectMetrics()

import { interfaces } from "../../di/inversify";
import { ProviderRegistry } from "../provider-registry";
import { IProvider, IMetrics } from "../provider.interface";
import { METADATA_KEY } from "../../di/binding-decorator/constants";

describe("ProviderRegistry.collectMetrics()", () => {
  let mockContainer: interfaces.Container;
  let registry: ProviderRegistry;

  beforeEach(() => {
    mockContainer = {
      isBound: jest.fn().mockReturnValue(true),
      get: jest.fn(),
    } as any;
    registry = new ProviderRegistry(mockContainer);
    jest.clearAllMocks();
    // Mock Reflect.getMetadata to return empty array by default
    jest.spyOn(Reflect, "getMetadata").mockImplementation((key, target) => {
      if (key === METADATA_KEY.provide && target === Reflect) {
        return [];
      }
      return undefined;
    });
  });

  it("should collect metrics from all metrics providers", () => {
    // Arrange
    class MetricsProvider implements IProvider, IMetrics {
      name = "MetricsProvider";
      getMetrics() {
        return {
          requests: 100,
          errors: 5,
        };
      }
    }

    const provider = new MetricsProvider();
    const getMetricsSpy = jest.spyOn(provider, "getMetrics");
    (mockContainer.get as jest.Mock).mockReturnValue(provider);

    const metadata = [{ implementationType: MetricsProvider }];
    jest.spyOn(Reflect, "getMetadata").mockReturnValue(metadata);
    registry.discover();

    // Act
    const dashboard = registry.collectMetrics();

    // Assert
    expect(dashboard.providers).toHaveProperty("MetricsProvider");
    expect(dashboard.providers.MetricsProvider).toEqual({
      requests: 100,
      errors: 5,
    });
    expect(getMetricsSpy).toHaveBeenCalled();
  });

  it("should handle multiple metrics providers", () => {
    // Arrange
    class MetricsProvider1 implements IProvider, IMetrics {
      name = "MetricsProvider1";
      getMetrics() {
        return { count: 10 };
      }
    }

    class MetricsProvider2 implements IProvider, IMetrics {
      name = "MetricsProvider2";
      getMetrics() {
        return { count: 20 };
      }
    }

    const provider1 = new MetricsProvider1();
    const provider2 = new MetricsProvider2();
    let callCount = 0;
    (mockContainer.get as jest.Mock).mockImplementation((target) => {
      callCount++;
      if (target === MetricsProvider1) return provider1;
      if (target === MetricsProvider2) return provider2;
      return null;
    });

    jest.spyOn(Reflect, "getMetadata").mockImplementation((key, target) => {
      if (key === METADATA_KEY.provide && target === Reflect) {
        return [
          { implementationType: MetricsProvider1 },
          { implementationType: MetricsProvider2 },
        ];
      }
      return undefined;
    });
    registry.discover();

    // Act
    const dashboard = registry.collectMetrics();

    // Assert
    expect(Object.keys(dashboard.providers).length).toBe(2);
    // Check that both providers are present (order may vary)
    const values = Object.values(dashboard.providers);
    expect(values).toContainEqual({ count: 10 });
    expect(values).toContainEqual({ count: 20 });
    // Verify specific provider names exist
    expect(dashboard.providers).toHaveProperty("MetricsProvider1");
    expect(dashboard.providers).toHaveProperty("MetricsProvider2");
  });

  it("should skip providers that are not metrics", () => {
    // Arrange
    class RegularProvider implements IProvider {
      name = "RegularProvider";
    }

    const provider = new RegularProvider();
    (mockContainer.get as jest.Mock).mockReturnValue(provider);

    jest.spyOn(Reflect, "getMetadata").mockImplementation((key, target) => {
      if (key === METADATA_KEY.provide && target === Reflect) {
        return [{ implementationType: RegularProvider }];
      }
      return undefined;
    });
    registry.discover();

    // Act
    const dashboard = registry.collectMetrics();

    // Assert
    expect(Object.keys(dashboard.providers).length).toBe(0);
  });

  it("should handle container.get errors gracefully", () => {
    // Arrange
    class MetricsProvider implements IProvider, IMetrics {
      name = "MetricsProvider";
      getMetrics() {
        return {};
      }
    }

    (mockContainer.get as jest.Mock).mockImplementation(() => {
      throw new Error("Container error");
    });

    const metadata = [{ implementationType: MetricsProvider }];
    jest.spyOn(Reflect, "getMetadata").mockReturnValue(metadata);
    registry.discover();

    // Act
    const dashboard = registry.collectMetrics();

    // Assert
    expect(Object.keys(dashboard.providers).length).toBe(0);
  });

  it("should return empty dashboard when no metrics providers", () => {
    // Arrange
    registry.discover();

    // Act
    const dashboard = registry.collectMetrics();

    // Assert
    expect(dashboard.providers).toEqual({});
  });
});
