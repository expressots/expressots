// Unit tests for: setGlobalRoutePrefix

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

describe("AppExpress.setGlobalRoutePrefix() setGlobalRoutePrefix method", () => {
  let appExpress: AppExpress;

  beforeEach(() => {
    appExpress = new AppExpress() as any;
  });

  describe("Happy Paths", () => {
    it("should set the global route prefix to a valid string", () => {
      const prefix = "/api";
      appExpress.setGlobalRoutePrefix(prefix);
      expect((appExpress as any).globalPrefix).toBe(prefix);
    });

    it("should set the global route prefix to an empty string", () => {
      const prefix = "";
      appExpress.setGlobalRoutePrefix(prefix);
      expect((appExpress as any).globalPrefix).toBe(prefix);
    });
  });

  describe("Edge Cases", () => {
    it("should handle setting a prefix with special characters", () => {
      const prefix = "/api/v1!";
      appExpress.setGlobalRoutePrefix(prefix);
      expect((appExpress as any).globalPrefix).toBe(prefix);
    });

    it("should handle setting a prefix with a long string", () => {
      const prefix = "/".repeat(1000);
      appExpress.setGlobalRoutePrefix(prefix);
      expect((appExpress as any).globalPrefix).toBe(prefix);
    });

    it("should handle setting a prefix with spaces", () => {
      const prefix = "/api v1";
      appExpress.setGlobalRoutePrefix(prefix);
      expect((appExpress as any).globalPrefix).toBe(prefix);
    });
  });
});

// End of unit tests for: setGlobalRoutePrefix
