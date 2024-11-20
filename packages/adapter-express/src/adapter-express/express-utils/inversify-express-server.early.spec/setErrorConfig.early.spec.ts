// Unit tests for: setErrorConfig

import type { ConfigFunction } from "../interfaces";
import { InversifyExpressServer } from "../inversify-express-server";

jest.mock("../utils", () => {
  const actual = jest.requireActual("../utils");
  return {
    ...actual,
    getControllersFromMetadata: jest.fn(),
    getControllersFromContainer: jest.fn(),
    getControllerMetadata: jest.fn(),
    getControllerMethodMetadata: jest.fn(),
    getControllerParameterMetadata: jest.fn(),
    instanceOfIHttpActionResult: jest.fn(),
  };
});

jest.mock("../decorators", () => {
  const actual = jest.requireActual("../decorators");
  return {
    ...actual,
    getRenderMetadata: jest.fn(),
  };
});

jest.mock("express", () => {
  const actual = jest.requireActual("express");
  const mockExpress = jest.fn(() => ({
    use: jest.fn(),
    all: jest.fn(),
  }));
  return Object.assign(mockExpress, actual);
});

class MockContainer {
  public bind = jest.fn().mockReturnThis();
  public to = jest.fn().mockReturnThis();
  public isBoundNamed = jest.fn();
  public createChild = jest.fn();
  public get = jest.fn();
}

class MockAuthProvider {
  public getUser = jest.fn();
}

describe("InversifyExpressServer.setErrorConfig() setErrorConfig method", () => {
  let mockContainer: MockContainer;
  let mockAuthProvider: MockAuthProvider;
  let server: InversifyExpressServer;

  beforeEach(() => {
    mockContainer = new MockContainer() as any;
    mockAuthProvider = new MockAuthProvider() as any;
    server = new InversifyExpressServer(
      mockContainer as any,
      null,
      null,
      null,
      mockAuthProvider as any,
    );
  });

  describe("Happy Path", () => {
    it("should set the error configuration function correctly", () => {
      const mockErrorConfigFn: ConfigFunction = jest.fn();

      // Act
      server.setErrorConfig(mockErrorConfigFn);

      // Assert
      expect((server as any)._errorConfigFn).toBe(mockErrorConfigFn);
    });

    it("should return the server instance for chaining", () => {
      const mockErrorConfigFn: ConfigFunction = jest.fn();

      // Act
      const result = server.setErrorConfig(mockErrorConfigFn);

      // Assert
      expect(result).toBe(server);
    });
  });

  describe("Edge Cases", () => {
    it("should handle setting a null error configuration function gracefully", () => {
      // Act
      server.setErrorConfig(null as any);

      // Assert
      expect((server as any)._errorConfigFn).toBeNull();
    });

    it("should handle setting an undefined error configuration function gracefully", () => {
      // Act
      server.setErrorConfig(undefined as any);

      // Assert
      expect((server as any)._errorConfigFn).toBeUndefined();
    });
  });
});

// End of unit tests for: setErrorConfig
