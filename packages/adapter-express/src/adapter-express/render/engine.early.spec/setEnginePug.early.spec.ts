// Unit tests for: setEnginePug

import { Application } from "express";
import { PUG_DEFAULTS } from "../constants";
import { setEnginePug } from "../engine";
import { packageResolver } from "../resolve-render";

jest.mock("../resolve-render", () => {
  const actual = jest.requireActual("../resolve-render");
  return {
    ...actual,
    packageResolver: jest.fn(),
  };
});

const mockApp = {
  set: jest.fn(),
} as unknown as Application;

type MockPugOptions = {
  viewEngine?: string;
  viewsDir?: string;
};

describe("setEnginePug() setEnginePug method", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Happy Path", () => {
    it("should set the view engine and views directory with default PUG_DEFAULTS", async () => {
      await setEnginePug(mockApp, undefined as any);

      expect(packageResolver).toHaveBeenCalledWith("pug");
      expect(mockApp.set).toHaveBeenCalledWith("view engine", PUG_DEFAULTS.viewEngine);
      expect(mockApp.set).toHaveBeenCalledWith("views", PUG_DEFAULTS.viewsDir);
    });

    it("should set the view engine and views directory with provided options", async () => {
      const mockOptions: MockPugOptions = {
        viewEngine: "customPug",
        viewsDir: "/custom/views",
      };

      await setEnginePug(mockApp, mockOptions as any);

      expect(packageResolver).toHaveBeenCalledWith("pug");
      expect(mockApp.set).toHaveBeenCalledWith("view engine", "customPug");
      expect(mockApp.set).toHaveBeenCalledWith("views", "/custom/views");
    });
  });

  describe("Edge Cases", () => {
    it("should handle missing viewEngine in options gracefully", async () => {
      const mockOptions: MockPugOptions = {
        viewsDir: "/custom/views",
      };

      await setEnginePug(mockApp, mockOptions as any);

      expect(packageResolver).toHaveBeenCalledWith("pug");
      expect(mockApp.set).toHaveBeenCalledWith("view engine", PUG_DEFAULTS.viewEngine);
      expect(mockApp.set).toHaveBeenCalledWith("views", "/custom/views");
    });

    it("should handle missing viewsDir in options gracefully", async () => {
      const mockOptions: MockPugOptions = {
        viewEngine: "customPug",
      };

      await setEnginePug(mockApp, mockOptions as any);

      expect(packageResolver).toHaveBeenCalledWith("pug");
      expect(mockApp.set).toHaveBeenCalledWith("view engine", "customPug");
      expect(mockApp.set).toHaveBeenCalledWith("views", PUG_DEFAULTS.viewsDir);
    });
  });
});

// End of unit tests for: setEnginePug
