// Unit tests for: build

import express, { Application, Router } from "express";
import { DUPLICATED_CONTROLLER_NAME, TYPE } from "../constants";
import type { ConfigFunction } from "../interfaces";
import { InversifyExpressServer } from "../inversify-express-server";
import { getControllersFromMetadata } from "../utils";

jest.mock("../utils", () => {
  const actual = jest.requireActual("../utils");
  return {
    ...actual,
    getControllersFromMetadata: jest.fn().mockReturnValue([]),
    getControllersFromContainer: jest.fn().mockReturnValue([]),
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

class MockContainer {
  public bind = jest.fn().mockReturnThis();
  public to = jest.fn().mockReturnThis();
  public toConstantValue = jest.fn().mockReturnThis();
  public isBoundNamed = jest.fn().mockReturnValue(false);
  public createChild = jest.fn().mockReturnThis();
  public get = jest.fn();
  public getNamed = jest.fn();
  public whenTargetNamed = jest.fn().mockReturnThis();
}

class MockAuthProvider {
  public getUser = jest.fn();
}

describe("InversifyExpressServer.build() build method", () => {
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
    it("should apply configuration function if provided", () => {
      // Arrange
      const configFn: ConfigFunction = jest.fn();
      server.setConfig(configFn);

      // Act
      const app = server.build();

      // Assert
      expect(configFn).toHaveBeenCalledWith(app);
    });

    it("should apply error configuration function if provided", () => {
      // Arrange
      const errorConfigFn: ConfigFunction = jest.fn();
      server.setErrorConfig(errorConfigFn);

      // Act
      const app = server.build();

      // Assert
      expect(errorConfigFn).toHaveBeenCalledWith(app);
    });
  });

  describe("Edge Cases", () => {
    it("should handle duplicated controller names gracefully", () => {
      // Arrange
      (getControllersFromMetadata as jest.Mock).mockReturnValue([{ name: "TestController" }]);
      mockContainer.isBoundNamed.mockReturnValue(true);

      // Act & Assert
      expect(() => server.build()).toThrow(DUPLICATED_CONTROLLER_NAME("TestController"));
    });

    it("should handle missing AuthProvider gracefully", () => {
      // Arrange
      server = new InversifyExpressServer(mockContainer as any);

      // Act
      const app = server.build();

      // Assert
      expect(app).toBeDefined();
      expect(mockContainer.bind).toHaveBeenCalledWith(TYPE.HttpContext);
      expect(mockContainer.toConstantValue).toHaveBeenCalledWith(expect.any(Object));
      expect(mockContainer.whenTargetNamed).toHaveBeenCalledTimes(1);
      expect(mockContainer.whenTargetNamed).toHaveBeenCalledWith(expect.any(String));
    });

    it("should handle missing controllers gracefully", () => {
      // Arrange
      (getControllersFromMetadata as jest.Mock).mockReturnValue([]);

      // Act
      const app = server.build();

      // Assert
      expect(app).toBeDefined();
    });
  });
});

// End of unit tests for: build
