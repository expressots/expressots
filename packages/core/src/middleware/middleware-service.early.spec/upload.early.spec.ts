// Unit tests for: upload

import { middlewareResolver } from "../middleware-resolver";
import { setGlobalUploadConfig } from "../upload-registry";
import { Middleware } from "../middleware-service";

jest.mock("../middleware-resolver", () => {
  const actual = jest.requireActual("../middleware-resolver");
  return {
    ...actual,
    middlewareResolver: jest.fn(),
  };
});

jest.mock("../upload-registry", () => ({
  setGlobalUploadConfig: jest.fn(),
}));

jest.mock("../../error/error-handler-middleware", () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe("Middleware.upload() upload method", () => {
  let middleware: Middleware;
  let mockMulterInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    middleware = new Middleware();
    mockMulterInstance = {
      single: jest.fn().mockReturnValue(jest.fn()),
      array: jest.fn().mockReturnValue(jest.fn()),
      fields: jest.fn().mockReturnValue(jest.fn()),
      any: jest.fn().mockReturnValue(jest.fn()),
      none: jest.fn().mockReturnValue(jest.fn()),
    };
    (middlewareResolver as jest.Mock).mockReturnValue(mockMulterInstance);
  });

  describe("Happy Path", () => {
    it("should return an upload handler with all methods", () => {
      const uploadHandler = middleware.upload();

      expect(uploadHandler).toHaveProperty("single");
      expect(uploadHandler).toHaveProperty("array");
      expect(uploadHandler).toHaveProperty("fields");
      expect(uploadHandler).toHaveProperty("any");
      expect(uploadHandler).toHaveProperty("none");
    });

    it("should configure upload with destination option", () => {
      middleware.upload({ destination: "./uploads" });

      expect(middlewareResolver).toHaveBeenCalledWith(
        "multer",
        expect.objectContaining({
          dest: "./uploads",
        }),
      );
    });

    it("should configure upload with limits option", () => {
      const limits = { fileSize: 10 * 1024 * 1024 };

      middleware.upload({ limits });

      expect(middlewareResolver).toHaveBeenCalledWith(
        "multer",
        expect.objectContaining({
          limits,
        }),
      );
    });

    it("should set global upload config when config is provided", () => {
      const config = { destination: "./uploads" };

      middleware.upload(config);

      expect(setGlobalUploadConfig).toHaveBeenCalledWith(config);
    });
  });

  describe("Upload Handler Methods", () => {
    it("should create single file upload handler", () => {
      const uploadHandler = middleware.upload();

      uploadHandler.single("avatar");

      expect(mockMulterInstance.single).toHaveBeenCalledWith("avatar");
    });

    it("should create array file upload handler", () => {
      const uploadHandler = middleware.upload();

      uploadHandler.array("photos", 5);

      expect(mockMulterInstance.array).toHaveBeenCalledWith("photos", 5);
    });

    it("should create fields upload handler", () => {
      const uploadHandler = middleware.upload();
      const fields = [
        { name: "avatar", maxCount: 1 },
        { name: "gallery", maxCount: 5 },
      ];

      uploadHandler.fields(fields);

      expect(mockMulterInstance.fields).toHaveBeenCalledWith(fields);
    });

    it("should create any file upload handler", () => {
      const uploadHandler = middleware.upload();

      uploadHandler.any();

      expect(mockMulterInstance.any).toHaveBeenCalled();
    });

    it("should create none (no files) upload handler", () => {
      const uploadHandler = middleware.upload();

      uploadHandler.none();

      expect(mockMulterInstance.none).toHaveBeenCalled();
    });
  });

  describe("File Filter", () => {
    it("should configure file filter when provided", () => {
      const fileFilter = jest.fn().mockReturnValue(true);

      middleware.upload({ fileFilter });

      expect(middlewareResolver).toHaveBeenCalledWith(
        "multer",
        expect.objectContaining({
          fileFilter: expect.any(Function),
        }),
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle no config provided", () => {
      const uploadHandler = middleware.upload();

      expect(uploadHandler).toBeDefined();
      expect(setGlobalUploadConfig).not.toHaveBeenCalled();
    });

    it("should handle null multer instance gracefully", () => {
      (middlewareResolver as jest.Mock).mockReturnValue(null);

      const uploadHandler = middleware.upload();

      // Methods should exist but throw when called on null
      expect(uploadHandler).toHaveProperty("single");
    });
  });
});

// End of unit tests for: upload
