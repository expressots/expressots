// Unit tests for: ValidateDTO

import { NextFunction, Request, Response } from "express";
import "reflect-metadata";
import { StatusCode } from "../../../error/status-code";
import { ValidateDTO } from "../dto-validator.provider";
import { packageResolver } from "../package-resolver";

// Mocking the packageResolver function
jest.mock("../package-resolver", () => {
  const actual = jest.requireActual("../package-resolver");
  return {
    ...actual,
    packageResolver: jest.fn(),
  };
});

// Mocking express Request, Response, and NextFunction
const mockRequest = () => {
  return {
    body: {},
  } as Request;
};

const mockResponse = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNextFunction = jest.fn() as NextFunction;

describe("ValidateDTO() ValidateDTO method", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Happy Path", () => {
    it("should call next() when DTO is valid", async () => {
      // Arrange
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNextFunction;
      const mockValidator = {
        validate: jest.fn().mockResolvedValue([]),
      };
      const mockTransformer = {
        plainToClass: jest.fn().mockReturnValue({}),
      };

      (packageResolver as jest.Mock).mockResolvedValueOnce(mockValidator);
      (packageResolver as jest.Mock).mockResolvedValueOnce(mockTransformer);

      const middleware = ValidateDTO(class {});

      // Act
      await middleware(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("should return 400 when DTO is invalid", async () => {
      // Arrange
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNextFunction;
      const mockValidator = {
        validate: jest.fn().mockResolvedValue([
          {
            property: "field",
            constraints: { isNotEmpty: "field should not be empty" },
          },
        ]),
      };
      const mockTransformer = {
        plainToClass: jest.fn().mockReturnValue({}),
      };

      (packageResolver as jest.Mock).mockResolvedValueOnce(mockValidator);
      (packageResolver as jest.Mock).mockResolvedValueOnce(mockTransformer);

      const middleware = ValidateDTO(class {});

      // Act
      await middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(StatusCode.BadRequest);
      expect(res.json).toHaveBeenCalledWith({
        errorCode: StatusCode.BadRequest,
        errorMessage: "Bad Request",
        DTO: [
          {
            property: "field",
            messages: ["field should not be empty"],
          },
        ],
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should call next() if class-validator or class-transformer is not resolved", async () => {
      // Arrange
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNextFunction;

      (packageResolver as jest.Mock).mockResolvedValueOnce(null);

      const middleware = ValidateDTO(class {});

      // Act
      await middleware(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it("should handle exceptions and call next with error", async () => {
      // Arrange
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNextFunction;
      const mockValidator = {
        validate: jest.fn().mockRejectedValue(new Error("Validation error")),
      };
      const mockTransformer = {
        plainToClass: jest.fn().mockReturnValue({}),
      };

      (packageResolver as jest.Mock).mockResolvedValueOnce(mockValidator);
      (packageResolver as jest.Mock).mockResolvedValueOnce(mockTransformer);

      const middleware = ValidateDTO(class {});

      // Act
      await middleware(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});

// End of unit tests for: ValidateDTO
