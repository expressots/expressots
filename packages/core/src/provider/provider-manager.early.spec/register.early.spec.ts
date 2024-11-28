// Unit tests for: register

import { BindingScopeEnum, interfaces } from "../../di/inversify";
import { ProviderManager } from "../provider-manager";

// Mock types and interfaces
type MockServiceIdentifier = string;
type MockNewable<T> = new (...args: any[]) => T;
type MockBindingScope = interfaces.BindingScope;

interface MockContainer {
  isBound: jest.Mock;
  bind: jest.Mock;
}

describe("ProviderManager.register() register method", () => {
  let mockContainer: MockContainer;
  let providerManager: ProviderManager;

  beforeEach(() => {
    mockContainer = {
      isBound: jest.fn(),
      bind: jest.fn().mockReturnValue({
        to: jest.fn().mockReturnValue({
          inSingletonScope: jest.fn(),
          inRequestScope: jest.fn(),
          inTransientScope: jest.fn(),
        }),
        toSelf: jest.fn().mockReturnValue({
          inSingletonScope: jest.fn(),
          inRequestScope: jest.fn(),
          inTransientScope: jest.fn(),
        }),
      }),
    };

    providerManager = new ProviderManager(mockContainer as any);
  });

  describe("Happy paths", () => {
    it("should register a provider with a constructor and default scope", () => {
      const mockServiceIdentifier: MockServiceIdentifier = "TestService";
      const mockConstructor: MockNewable<any> = jest.fn();

      mockContainer.isBound.mockReturnValue(false);

      providerManager.register(
        mockServiceIdentifier as any,
        mockConstructor as any,
      );

      expect(mockContainer.isBound).toHaveBeenCalledWith(
        mockServiceIdentifier as any,
      );
      expect(mockContainer.bind).toHaveBeenCalledWith(
        mockServiceIdentifier as any,
      );
      expect(mockContainer.bind().to).toHaveBeenCalledWith(
        mockConstructor as any,
      );
    });

    it("should register a provider with a constructor and specified scope", () => {
      const mockServiceIdentifier: MockServiceIdentifier = "TestService";
      const mockConstructor: MockNewable<any> = jest.fn();
      const mockScope: MockBindingScope = BindingScopeEnum.Singleton;

      mockContainer.isBound.mockReturnValue(false);

      providerManager.register(
        mockServiceIdentifier as any,
        mockConstructor as any,
        mockScope as any,
      );

      expect(mockContainer.isBound).toHaveBeenCalledWith(
        mockServiceIdentifier as any,
      );
      expect(mockContainer.bind).toHaveBeenCalledWith(
        mockServiceIdentifier as any,
      );
      expect(mockContainer.bind().to).toHaveBeenCalledWith(
        mockConstructor as any,
      );
      expect(mockContainer.bind().to().inSingletonScope).toHaveBeenCalled();
    });

    it("should register a provider to itself with default scope", () => {
      const mockServiceIdentifier: MockServiceIdentifier = "TestService";

      mockContainer.isBound.mockReturnValue(false);

      providerManager.register(mockServiceIdentifier as any);

      expect(mockContainer.isBound).toHaveBeenCalledWith(
        mockServiceIdentifier as any,
      );
      expect(mockContainer.bind).toHaveBeenCalledWith(
        mockServiceIdentifier as any,
      );
      expect(mockContainer.bind().toSelf).toHaveBeenCalled();
      expect(mockContainer.bind().toSelf().inTransientScope).toHaveBeenCalled();
    });
  });

  describe("Edge cases", () => {
    it("should not register a provider if it is already bound", () => {
      const mockServiceIdentifier: MockServiceIdentifier = "TestService";

      mockContainer.isBound.mockReturnValue(true);

      providerManager.register(mockServiceIdentifier as any);

      expect(mockContainer.isBound).toHaveBeenCalledWith(
        mockServiceIdentifier as any,
      );
      expect(mockContainer.bind).not.toHaveBeenCalled();
    });

    it("should handle undefined scope gracefully", () => {
      const mockServiceIdentifier: MockServiceIdentifier = "TestService";
      const mockConstructor: MockNewable<any> = jest.fn();

      mockContainer.isBound.mockReturnValue(false);

      providerManager.register(
        mockServiceIdentifier as any,
        mockConstructor as any,
        undefined as any,
      );

      expect(mockContainer.isBound).toHaveBeenCalledWith(
        mockServiceIdentifier as any,
      );
      expect(mockContainer.bind).toHaveBeenCalledWith(
        mockServiceIdentifier as any,
      );
      expect(mockContainer.bind().to).toHaveBeenCalledWith(
        mockConstructor as any,
      );
    });
  });
});

// End of unit tests for: register
