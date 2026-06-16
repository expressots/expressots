// Unit tests for: ProviderRegistry.checkHealth()

import { interfaces } from "../../di/inversify";
import { ProviderRegistry } from "../provider-registry";
import { IProvider, IHealthCheck } from "../provider.interface";
import { METADATA_KEY } from "../../di/binding-decorator/constants";
import "reflect-metadata";

describe("ProviderRegistry.checkHealth()", () => {
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

  it("should run health checks on all health check providers", async () => {
    // Arrange
    class HealthProvider implements IProvider, IHealthCheck {
      name = "HealthProvider";
      healthCheck(): Promise<{ status: "healthy"; message: string }> {
        return Promise.resolve({
          status: "healthy" as const,
          message: "OK",
        });
      }
    }

    const provider = new HealthProvider();
    const healthCheckSpy = jest.spyOn(provider, "healthCheck");
    (mockContainer.get as jest.Mock).mockReturnValue(provider);

    // Register provider
    jest.spyOn(Reflect, "getMetadata").mockImplementation((key, target) => {
      if (key === METADATA_KEY.provide && target === Reflect) {
        return [{ implementationType: HealthProvider }];
      }
      return undefined;
    });
    registry.discover();

    // Act
    const dashboard = await registry.checkHealth();

    // Assert
    expect(dashboard.overall).toBe("healthy");
    expect(dashboard.providers.length).toBeGreaterThan(0);
    expect(healthCheckSpy).toHaveBeenCalled();
  });

  it("should handle unhealthy providers", async () => {
    // Arrange
    class UnhealthyProvider implements IProvider, IHealthCheck {
      name = "UnhealthyProvider";
      healthCheck(): Promise<{ status: "unhealthy"; message: string }> {
        return Promise.resolve({
          status: "unhealthy" as const,
          message: "Failed",
        });
      }
    }

    const provider = new UnhealthyProvider();
    (mockContainer.get as jest.Mock).mockReturnValue(provider);

    jest.spyOn(Reflect, "getMetadata").mockImplementation((key, target) => {
      if (key === METADATA_KEY.provide && target === Reflect) {
        return [{ implementationType: UnhealthyProvider }];
      }
      return undefined;
    });
    registry.discover();

    // Act
    const dashboard = await registry.checkHealth();

    // Assert
    expect(dashboard.overall).toBe("unhealthy");
  });

  it("should handle degraded providers", async () => {
    // Arrange
    class DegradedProvider implements IProvider, IHealthCheck {
      name = "DegradedProvider";
      healthCheck(): Promise<{ status: "degraded"; message: string }> {
        return Promise.resolve({
          status: "degraded" as const,
          message: "Slow",
        });
      }
    }

    const provider = new DegradedProvider();
    (mockContainer.get as jest.Mock).mockReturnValue(provider);

    jest.spyOn(Reflect, "getMetadata").mockImplementation((key, target) => {
      if (key === METADATA_KEY.provide && target === Reflect) {
        return [{ implementationType: DegradedProvider }];
      }
      return undefined;
    });
    registry.discover();

    // Act
    const dashboard = await registry.checkHealth();

    // Assert
    expect(dashboard.overall).toBe("degraded");
  });

  it("should handle health check failures", async () => {
    // Arrange
    class FailingProvider implements IProvider, IHealthCheck {
      name = "FailingProvider";
      healthCheck(): Promise<never> {
        return Promise.reject(new Error("Check failed"));
      }
    }

    const provider = new FailingProvider();
    (mockContainer.get as jest.Mock).mockReturnValue(provider);

    jest.spyOn(Reflect, "getMetadata").mockImplementation((key, target) => {
      if (key === METADATA_KEY.provide && target === Reflect) {
        return [{ implementationType: FailingProvider }];
      }
      return undefined;
    });
    registry.discover();

    // Act
    const dashboard = await registry.checkHealth();

    // Assert
    expect(dashboard.overall).toBe("unhealthy");
    const failingProvider = dashboard.providers.find(
      (p) => p.name === "FailingProvider",
    );
    expect(failingProvider?.result.status).toBe("unhealthy");
    expect(failingProvider?.result.message).toContain("Check failed");
  });

  it("should handle providers that are not health checks", async () => {
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
    const dashboard = await registry.checkHealth();

    // Assert
    expect(dashboard.providers.length).toBe(0);
  });

  it("should handle container.get errors", async () => {
    // Arrange
    class HealthProvider implements IProvider, IHealthCheck {
      name = "HealthProvider";
      healthCheck(): Promise<{ status: "healthy" }> {
        return Promise.resolve({
          status: "healthy" as const,
        });
      }
    }

    (mockContainer.get as jest.Mock).mockImplementation(() => {
      throw new Error("Container error");
    });

    jest.spyOn(Reflect, "getMetadata").mockImplementation((key, target) => {
      if (key === METADATA_KEY.provide && target === Reflect) {
        return [{ implementationType: HealthProvider }];
      }
      return undefined;
    });
    registry.discover();

    // Act
    const dashboard = await registry.checkHealth();

    // Assert
    expect(dashboard.providers.length).toBeGreaterThan(0);
    const failedProvider = dashboard.providers.find(
      (p) => p.name === "HealthProvider",
    );
    expect(failedProvider?.result.status).toBe("unhealthy");
  });

  it("should set checkedAt timestamp", async () => {
    // Arrange
    class HealthProvider implements IProvider, IHealthCheck {
      name = "HealthProvider";
      healthCheck(): Promise<{ status: "healthy" }> {
        return Promise.resolve({
          status: "healthy" as const,
        });
      }
    }

    const provider = new HealthProvider();
    (mockContainer.get as jest.Mock).mockReturnValue(provider);

    const metadata = [{ implementationType: HealthProvider }];
    jest.spyOn(Reflect, "getMetadata").mockReturnValue(metadata);
    registry.discover();

    // Act
    const dashboard = await registry.checkHealth();

    // Assert
    expect(dashboard.checkedAt).toBeDefined();
    expect(dashboard.providers[0].result.checkedAt).toBeDefined();
  });

  it("should determine overall status as unhealthy if any unhealthy", async () => {
    // Arrange
    class HealthyProvider implements IProvider, IHealthCheck {
      name = "HealthyProvider";
      healthCheck(): Promise<{ status: "healthy" }> {
        return Promise.resolve({
          status: "healthy" as const,
        });
      }
    }

    class UnhealthyProvider implements IProvider, IHealthCheck {
      name = "UnhealthyProvider";
      healthCheck(): Promise<{ status: "unhealthy" }> {
        return Promise.resolve({
          status: "unhealthy" as const,
        });
      }
    }

    let callCount = 0;
    (mockContainer.get as jest.Mock).mockImplementation(() => {
      callCount++;
      if (callCount === 1) return new HealthyProvider();
      return new UnhealthyProvider();
    });

    jest.spyOn(Reflect, "getMetadata").mockImplementation((key, target) => {
      if (key === METADATA_KEY.provide && target === Reflect) {
        return [
          { implementationType: HealthyProvider },
          { implementationType: UnhealthyProvider },
        ];
      }
      return undefined;
    });
    registry.discover();

    // Act
    const dashboard = await registry.checkHealth();

    // Assert
    expect(dashboard.overall).toBe("unhealthy");
  });

  it("should determine overall status as degraded if any degraded and none unhealthy", async () => {
    // Arrange
    class HealthyProvider implements IProvider, IHealthCheck {
      name = "HealthyProvider";
      healthCheck(): Promise<{ status: "healthy" }> {
        return Promise.resolve({
          status: "healthy" as const,
        });
      }
    }

    class DegradedProvider implements IProvider, IHealthCheck {
      name = "DegradedProvider";
      healthCheck(): Promise<{ status: "degraded" }> {
        return Promise.resolve({
          status: "degraded" as const,
        });
      }
    }

    let callCount = 0;
    (mockContainer.get as jest.Mock).mockImplementation(() => {
      callCount++;
      if (callCount === 1) return new HealthyProvider();
      return new DegradedProvider();
    });

    jest.spyOn(Reflect, "getMetadata").mockImplementation((key, target) => {
      if (key === METADATA_KEY.provide && target === Reflect) {
        return [
          { implementationType: HealthyProvider },
          { implementationType: DegradedProvider },
        ];
      }
      return undefined;
    });
    registry.discover();

    // Act
    const dashboard = await registry.checkHealth();

    // Assert
    expect(dashboard.overall).toBe("degraded");
  });
});
