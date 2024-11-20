// Unit tests for: setConfig

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

class MockContainer {
  public bind = jest.fn();
  public isBoundNamed = jest.fn();
  public createChild = jest.fn();
  public get = jest.fn();
}

describe("InversifyExpressServer.setConfig() setConfig method", () => {
  let mockContainer: MockContainer;
  let server: InversifyExpressServer;

  beforeEach(() => {
    mockContainer = new MockContainer() as any;
    server = new InversifyExpressServer(mockContainer as any);
  });

  describe("Happy Path", () => {
    it("should set the configuration function and return the server instance", () => {
      const configFn: ConfigFunction = jest.fn();

      const result = server.setConfig(configFn);

      expect(result).toBe(server);
      expect((server as any)._configFn).toBe(configFn);
    });
  });

  describe("Edge Cases", () => {
    it("should overwrite an existing configuration function", () => {
      const initialConfigFn: ConfigFunction = jest.fn();
      const newConfigFn: ConfigFunction = jest.fn();

      server.setConfig(initialConfigFn);
      server.setConfig(newConfigFn);

      expect((server as any)._configFn).toBe(newConfigFn);
    });

    it("should handle setting a null configuration function gracefully", () => {
      const result = server.setConfig(null as any);

      expect(result).toBe(server);
      expect((server as any)._configFn).toBeNull();
    });

    it("should handle setting an undefined configuration function gracefully", () => {
      const result = server.setConfig(undefined as any);

      expect(result).toBe(server);
      expect((server as any)._configFn).toBeUndefined();
    });
  });
});

// End of unit tests for: setConfig
