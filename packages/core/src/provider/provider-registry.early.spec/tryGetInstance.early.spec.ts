// Unit tests for: ProviderRegistry.tryGetInstance() private method

import { interfaces } from "../../di/inversify";
import { ProviderRegistry } from "../provider-registry";
import { METADATA_KEY } from "../../di/binding-decorator/constants";

describe("ProviderRegistry.tryGetInstance()", () => {
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

  it("should return instance when bound and get succeeds", () => {
    // Arrange
    class TestProvider {}
    const instance = new TestProvider();
    (mockContainer.isBound as jest.Mock).mockReturnValue(true);
    (mockContainer.get as jest.Mock).mockReturnValue(instance);

    // Act
    const result = (registry as any).tryGetInstance(TestProvider);

    // Assert
    expect(result).toBe(instance);
    expect(mockContainer.isBound).toHaveBeenCalledWith(TestProvider);
    expect(mockContainer.get).toHaveBeenCalledWith(TestProvider);
  });

  it("should return null when not bound", () => {
    // Arrange
    class TestProvider {}
    (mockContainer.isBound as jest.Mock).mockReturnValue(false);

    // Act
    const result = (registry as any).tryGetInstance(TestProvider);

    // Assert
    expect(result).toBeNull();
    expect(mockContainer.get).not.toHaveBeenCalled();
  });

  it("should return null when get throws error", () => {
    // Arrange
    class TestProvider {}
    (mockContainer.isBound as jest.Mock).mockReturnValue(true);
    (mockContainer.get as jest.Mock).mockImplementation(() => {
      throw new Error("Resolution failed");
    });

    // Act
    const result = (registry as any).tryGetInstance(TestProvider);

    // Assert
    expect(result).toBeNull();
  });
});

