// Unit tests for: setEngineEjs

import { Application } from "express";
import { EJS_DEFAULTS } from "../constants";
import { setEngineEjs } from "../engine";
import { packageResolver } from "../resolve-render";

jest.mock("../resolve-render", () => ({
  packageResolver: jest.fn(),
}));

describe("setEngineEjs() setEngineEjs method", () => {
  let app: Application;

  beforeEach(() => {
    app = {
      set: jest.fn(),
      locals: {},
    } as unknown as Application;
  });

  describe("Happy Path", () => {
    it("should set the default view engine and views directory when no options are provided", async () => {
      // Arrange & Act
      await setEngineEjs(app);

      // Assert
      expect(packageResolver).toHaveBeenCalledWith("ejs");
      expect(app.set).toHaveBeenCalledWith("view engine", EJS_DEFAULTS.viewEngine);
      expect(app.set).toHaveBeenCalledWith("views", EJS_DEFAULTS.viewsDir);
    });

    it("should set the provided view engine and views directory", async () => {
      // Arrange
      const options = {
        viewEngine: "custom-ejs",
        viewsDir: "custom/views",
      };

      // Act
      await setEngineEjs(app, options);

      // Assert
      expect(packageResolver).toHaveBeenCalledWith("ejs");
      expect(app.set).toHaveBeenCalledWith("view engine", options.viewEngine);
      expect(app.set).toHaveBeenCalledWith("views", options.viewsDir);
    });

    it("should set multiple views directories if an array is provided", async () => {
      // Arrange
      const options = {
        viewsDir: ["views/dir1", "views/dir2"],
      };

      // Act
      await setEngineEjs(app, options);

      // Assert
      expect(packageResolver).toHaveBeenCalledWith("ejs");
      options.viewsDir.forEach((dir) => {
        expect(app.set).toHaveBeenCalledWith("views", dir);
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle an empty viewsDir array gracefully", async () => {
      // Arrange
      const options = {
        viewsDir: [],
      };

      // Act
      await setEngineEjs(app, options);

      // Assert
      expect(packageResolver).toHaveBeenCalledWith("ejs");
      expect(app.set).toHaveBeenCalledWith("view engine", EJS_DEFAULTS.viewEngine);
      expect(app.set).toHaveBeenCalledWith("views", options.viewsDir);
    });
  });
});

// End of unit tests for: setEngineEjs
