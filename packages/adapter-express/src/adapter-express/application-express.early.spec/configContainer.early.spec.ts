// Unit tests for: configContainer

import { interfaces } from "../../di/di.interfaces";
import { AppExpress } from "../application-express";

jest.mock("@expressots/core", () => ({
  ExpressoMiddleware: class {},
  AppContainer: jest.fn().mockImplementation(() => new MockAppContainer() as any),
  Logger: jest.fn().mockImplementation(() => new MockLogger() as any),
  ProviderManager: jest.fn().mockImplementation(() => new MockProviderManager() as any),
  Middleware: jest.fn().mockImplementation(() => new MockMiddleware() as any),
  Console: jest.fn().mockImplementation(() => new MockConsole() as any),
  injectable: () => (target: any) => target,
  inject: jest.fn(() => jest.fn()),
}));

class MockLogger {
  error = jest.fn();
}

class MockProviderManager {
  constructor() {}
}

class MockMiddleware {
  getMiddlewarePipeline = jest.fn().mockReturnValue([]);
}

class MockAppContainer {
  Container = {};
  create = jest.fn();
}

class MockConsole {
  messageServer = jest.fn();
}

describe("AppExpress.configContainer() configContainer method", () => {
  let appExpress: AppExpress;

  beforeEach(() => {
    appExpress = new AppExpress();
  });

  describe("Happy Path", () => {
    it("should configure the container with provided modules", () => {
      const mockModules: Array<interfaces.ContainerModule> = [{} as any];
      const mockOptions: interfaces.ContainerOptions = {} as any;

      const result = appExpress.configContainer(mockModules, mockOptions);

      expect(result).toBeInstanceOf(MockAppContainer);
      expect(result.create).toHaveBeenCalledWith(mockModules);
    });

    it("should configure the container with default options if none are provided", () => {
      const mockModules: Array<interfaces.ContainerModule> = [{} as any];

      const result = appExpress.configContainer(mockModules);

      expect(result).toBeInstanceOf(MockAppContainer);
      expect(result.create).toHaveBeenCalledWith(mockModules);
    });
  });

  describe("Edge Cases", () => {
    it("should log an error if no modules are provided", () => {
      const mockLogger = new MockLogger();
      appExpress["logger"] = mockLogger as any;

      const result = appExpress.configContainer(undefined as any);

      expect(result).toBeUndefined();
      expect(mockLogger.error).toHaveBeenCalledWith(
        "No modules provided for container configuration",
        "adapter-express",
      );
    });
  });
});

// End of unit tests for: configContainer
