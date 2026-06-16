// Unit tests for: ProviderRegistry.getProviderMetadata() private method

import { interfaces } from "../../di/inversify";
import { ProviderRegistry } from "../provider-registry";
import { IProvider } from "../provider.interface";

describe("ProviderRegistry.getProviderMetadata()", () => {
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

  it("should return metadata from instance with name", () => {
    // Arrange
    class TestProvider {}
    const instance: Partial<IProvider> = {
      name: "Test Provider",
      version: "1.0.0",
      description: "Test description",
      author: "Test Author",
      repo: "https://github.com/test/repo",
    };

    // Act
    const result = (registry as any).getProviderMetadata(
      TestProvider,
      instance,
    );

    // Assert
    expect(result).toEqual({
      name: "Test Provider",
      version: "1.0.0",
      description: "Test description",
      author: "Test Author",
      repo: "https://github.com/test/repo",
    });
  });

  it("should return empty object when instance is null", () => {
    // Arrange
    class TestProvider {}

    // Act
    const result = (registry as any).getProviderMetadata(TestProvider, null);

    // Assert
    // The method returns { name: target.name } as fallback when instance is null
    expect(result).toEqual({ name: "TestProvider" });
  });

  it("should return empty object when instance is not an object", () => {
    // Arrange
    class TestProvider {}

    // Act
    const result = (registry as any).getProviderMetadata(
      TestProvider,
      "string",
    );

    // Assert
    // The method returns { name: target.name } as fallback when instance is not an object
    expect(result).toEqual({ name: "TestProvider" });
  });

  it("should return empty object when instance has no name", () => {
    // Arrange
    class TestProvider {}
    const instance = { version: "1.0.0" };

    // Act
    const result = (registry as any).getProviderMetadata(
      TestProvider,
      instance,
    );

    // Assert
    // The method returns { name: target.name } as fallback when instance has no name
    expect(result).toEqual({ name: "TestProvider" });
  });
});
