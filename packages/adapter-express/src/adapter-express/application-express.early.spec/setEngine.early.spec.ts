// Unit tests for: setEngine

import { RenderEngine } from "../../../node_modules/@expressots/shared";
import { IMiddleware } from "../../../node_modules/@expressots/core";
import { AppExpress } from "../application-express";

// Mocking the necessary functions from './render/engine'
jest.mock("../render/engine", () => {
  const actual = jest.requireActual("../render/engine");
  return {
    ...actual,
    setEngineEjs: jest.fn(),
    setEngineHandlebars: jest.fn(),
    setEnginePug: jest.fn(),
  };
});

// Mock classes and types
class MockLogger {
  error = jest.fn();
}

class MockConsole {
  messageServer = jest.fn();
}

class MockAppContainer {
  Container = {};
}

class MockProviderManager {}

interface MockIMiddleware {}

describe("AppExpress.setEngine() setEngine method", () => {
  let appExpress: AppExpress;

  beforeEach(() => {
    appExpress = new AppExpress() as any;
    appExpress["logger"] = new MockLogger() as any;
    appExpress["console"] = new MockConsole() as any;
    appExpress["appContainer"] = new MockAppContainer() as any;
    appExpress["providerManager"] = new MockProviderManager() as any;
    appExpress["middlewareManager"] = {} as MockIMiddleware as IMiddleware;
  });

  describe("Happy Paths", () => {
    it("should set the render options with engine and options", async () => {
      const engine = RenderEngine.Engine.EJS;
      const options: RenderEngine.EjsOptions = { viewsDir: "views" };

      await appExpress.setEngine(engine, options);

      expect(appExpress["renderOptions"]).toEqual({ engine, options });
    });

    it("should set the render options with engine only", async () => {
      const engine = RenderEngine.Engine.PUG;

      await appExpress.setEngine(engine);

      expect(appExpress["renderOptions"]).toEqual({ engine });
    });
  });

  describe("Edge Cases", () => {
    it("should handle unsupported engine type gracefully", async () => {
      const engine = "UNSUPPORTED_ENGINE" as RenderEngine.Engine;

      await expect(appExpress.setEngine(engine)).resolves.not.toThrow();
      expect(appExpress["renderOptions"]).toEqual({ engine });
    });
  });
});

// End of unit tests for: setEngine
