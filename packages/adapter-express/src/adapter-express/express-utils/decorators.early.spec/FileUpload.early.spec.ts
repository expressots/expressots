// Unit tests for: FileUpload
import "reflect-metadata";

import { Report, StatusCode } from "@expressots/core";
import { NextFunction, Request, Response } from "express";
import { FileUpload } from "../decorators";
import { packageResolver } from "../resolver-multer";

// Mocking the necessary modules
jest.mock("../resolver-multer", () => {
  const actual = jest.requireActual("../resolver-multer");
  return {
    ...actual,
    packageResolver: jest.fn(),
  };
});

// Mock interfaces
interface MockMulterOptions {
  dest?: string;
  storage?: MockStorageEngine;
  limits?: MockMulterLimits;
  fileFilter?: MockFileFilter;
}

interface MockStorageEngine {
  _handleFile: jest.Mock;
  _removeFile: jest.Mock;
}

interface MockMulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination?: string;
  filename?: string;
  path?: string;
  buffer?: Buffer;
}

interface MockMulterLimits {
  fieldNameSize?: number;
  fieldSize?: number;
  fields?: number;
  fileSize?: number;
  files?: number;
  parts?: number;
  headerPairs?: number;
}

type MockFileFilterCallback = (error: Error | null, acceptFile: boolean) => void;
type MockFileFilter = (
  req: Request,
  file: MockMulterFile,
  callback: MockFileFilterCallback,
) => void;

// Mocking express Request, Response, and NextFunction
const mockRequest = {} as Request;
const mockResponse = {
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
  send: jest.fn(),
} as unknown as Response;
const mockNextFunction = jest.fn() as NextFunction;

// Mocking packageResolver to return a mock multer
const mockMulter = jest.fn().mockReturnValue({
  single: jest.fn(),
  array: jest.fn(),
  fields: jest.fn(),
  none: jest.fn(),
  any: jest.fn(),
});
(packageResolver as jest.Mock).mockReturnValue(mockMulter);

describe("FileUpload() FileUpload method", () => {
  // Happy path tests
  describe("Happy Path", () => {
    it("should handle single file upload correctly", () => {
      const options = { fieldName: "file" };
      const multerOptions: MockMulterOptions = {} as any;
      const decorator = FileUpload(options, multerOptions as any);

      const target = {};
      const propertyKey = "testMethod";
      const descriptor = {
        value: jest.fn(),
      };

      decorator(target, propertyKey, descriptor);

      const req = { ...mockRequest, method: "POST" } as Request;
      const res = mockResponse;
      const next = mockNextFunction;

      const mockSingleMiddleware = jest.fn((req, res, next) => {
        next();
      });

      (mockMulter().single as jest.Mock).mockReturnValue(mockSingleMiddleware);

      // Act
      const multerMiddleware = mockMulter().single("file");
      multerMiddleware(req, res, next);

      // Assert
      expect(mockMulter().single).toHaveBeenCalledWith("file");
      expect(mockSingleMiddleware).toHaveBeenCalledWith(req, res, next);
    });

    it("should handle array file upload correctly", () => {
      const options = { fieldName: "files", maxCount: 3 };
      const multerOptions: MockMulterOptions = {} as any;
      const decorator = FileUpload(options, multerOptions as any);

      const target = {};
      const propertyKey = "testMethod";
      const descriptor = {
        value: jest.fn(),
      };

      decorator(target, propertyKey, descriptor);

      const req = { ...mockRequest, method: "POST" } as Request;
      const res = mockResponse;
      const next = mockNextFunction;

      const mockArrayMiddleware = jest.fn((req, res, next) => {
        next();
      });

      (mockMulter().array as jest.Mock).mockReturnValue(mockArrayMiddleware);

      const multerMiddleware = mockMulter().array("files", 3);
      multerMiddleware(req, res, next);

      expect(mockArrayMiddleware).toHaveBeenCalledWith(req, res, next);

      expect(mockMulter().array).toHaveBeenCalledWith("files", 3);
    });
  });

  // Edge case tests
  describe("Edge Cases", () => {
    it("should handle no file upload correctly", () => {
      const options = { none: true };
      const multerOptions: MockMulterOptions = {} as any;
      const decorator = FileUpload(options, multerOptions as any);

      const target = {};
      const propertyKey = "testMethod";
      const descriptor = {
        value: jest.fn(),
      };

      decorator(target, propertyKey, descriptor);

      const req = { ...mockRequest, method: "POST" } as Request;
      const res = mockResponse;
      const next = mockNextFunction;

      const mockNoneMiddleware = jest.fn((req, res, next) => {
        next();
      });

      (mockMulter().none as jest.Mock).mockReturnValue(mockNoneMiddleware);

      const multerMiddleware = mockMulter().none();
      multerMiddleware(req, res, next);

      expect(mockMulter().none).toHaveBeenCalled();
    });

    it("should handle any file upload correctly", () => {
      const options = { any: true };
      const multerOptions: MockMulterOptions = {} as any;
      const decorator = FileUpload(options, multerOptions as any);

      const target = {};
      const propertyKey = "testMethod";
      const descriptor = {
        value: jest.fn(),
      };

      decorator(target, propertyKey, descriptor);

      const req = { ...mockRequest, method: "POST" } as Request;
      const res = mockResponse;
      const next = mockNextFunction;

      const mockAnyMiddleware = jest.fn((req, res, next) => {
        next();
      });

      (mockMulter().any as jest.Mock).mockReturnValue(mockAnyMiddleware);

      const multerMiddleware = mockMulter().any();
      multerMiddleware(req, res, next);

      expect(mockMulter().any).toHaveBeenCalled();
    });

    it("should throw error for invalid options", () => {
      const options = { invalid: true } as any;
      const multerOptions: MockMulterOptions = {} as any;

      expect(() => {
        FileUpload(options, multerOptions as any);
      }).toThrowError(
        new Report().error(
          "Invalid options provided for FileUpload.",
          StatusCode.InternalServerError,
          "multer-decorator",
        ),
      );
    });
  });
});

// End of unit tests for: FileUpload
