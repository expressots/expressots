// Unit tests for: setEngineHandlebars

jest.mock("@expressots/core", () => ({
  Logger: jest.fn().mockImplementation(() => ({
    error: jest.fn(),
  })),
}));

import { Application } from "express";
import { DEFAULT_PARTIALS_DIR, HANDLEBARS_DEFAULTS } from "../constants";
import { setEngineHandlebars } from "../engine";
import { packageResolver } from "../resolve-render";

jest.mock("../resolve-render", () => ({
  packageResolver: jest.fn(),
}));

describe("setEngineHandlebars() setEngineHandlebars method", () => {
  let mockApp: Partial<Application>;
  let mockLogger: { error: jest.Mock };
  let mockPackageResolver: jest.Mock;

  beforeEach(() => {
    mockApp = {
      set: jest.fn(),
    };

    mockLogger = {
      error: jest.fn(),
    };

    jest.mocked(require("@expressots/core").Logger).mockImplementation(() => mockLogger);

    mockPackageResolver = packageResolver as jest.Mock;
  });

  it("should set Handlebars as the view engine with default options", async () => {
    const mockHbs = {
      registerPartials: jest.fn(),
    };
    mockPackageResolver.mockReturnValue(mockHbs as any);

    await setEngineHandlebars(mockApp as Application, {} as any);

    expect(mockPackageResolver).toHaveBeenCalledWith("hbs");
    expect(mockHbs.registerPartials).toHaveBeenCalledWith(DEFAULT_PARTIALS_DIR);
    expect(mockApp.set).toHaveBeenCalledWith("view engine", HANDLEBARS_DEFAULTS.viewEngine);
    expect(mockApp.set).toHaveBeenCalledWith("views", HANDLEBARS_DEFAULTS.viewsDir);
  });

  it("should set Handlebars as the view engine with custom options", async () => {
    const customOptions = {
      partialsDir: "/custom/partials",
      viewEngine: "custom-engine",
      viewsDir: "/custom/views",
    };
    const mockHbs = {
      registerPartials: jest.fn(),
    };
    mockPackageResolver.mockReturnValue(mockHbs as any);

    await setEngineHandlebars(mockApp as Application, customOptions as any);

    expect(mockPackageResolver).toHaveBeenCalledWith("hbs");
    expect(mockHbs.registerPartials).toHaveBeenCalledWith(customOptions.partialsDir);
    expect(mockApp.set).toHaveBeenCalledWith("view engine", customOptions.viewEngine);
    expect(mockApp.set).toHaveBeenCalledWith("views", customOptions.viewsDir);
  });

  it("should log an error if packageResolver throws an error", async () => {
    const errorMessage = "Failed to resolve package";
    mockPackageResolver.mockImplementation(() => {
      throw new Error(errorMessage);
    });

    await setEngineHandlebars(mockApp as Application, {} as any);

    expect(mockLogger.error).toHaveBeenCalledWith(errorMessage, "handlebars-config");
  });
});

// End of unit tests for: setEngineHandlebars
