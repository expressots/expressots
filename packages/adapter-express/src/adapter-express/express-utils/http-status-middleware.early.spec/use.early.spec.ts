// Unit tests for: use

import { NextFunction, Request, Response } from "express";
import "reflect-metadata";
import { HTTP_CODE_METADATA } from "../constants";
import { HttpStatusCodeMiddleware } from "../http-status-middleware";

describe("HttpStatusCodeMiddleware.use() use method", () => {
  let middleware: HttpStatusCodeMiddleware;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    middleware = new HttpStatusCodeMiddleware("/");
    req = {
      path: "/test",
      method: "GET",
    };
    res = {
      status: jest.fn().mockImplementation((code) => {
        res.statusCode = code;
        return res;
      }),
      statusCode: 0,
    };
    next = jest.fn();
  });

  describe("Happy Path", () => {
    it("should set the status code based on the metadata mapping", () => {
      // Arrange
      const statusCodeMapping = { "/test/-get": 200 };
      Reflect.defineMetadata(HTTP_CODE_METADATA.httpCode, statusCodeMapping, Reflect);

      // Act
      middleware.use(req as Request, res as Response, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(next).toHaveBeenCalled();
    });

    it("should set the default status code for GET method when no mapping is found", () => {
      // Arrange
      Reflect.defineMetadata(HTTP_CODE_METADATA.httpCode, {}, Reflect);

      // Act
      middleware.use(req as Request, res as Response, next);

      // Assert
      expect(res.statusCode).toBe(200);
      expect(next).toHaveBeenCalled();
    });

    it("should set the default status code for POST method when no mapping is found", () => {
      // Arrange
      req.method = "POST";
      Reflect.defineMetadata(HTTP_CODE_METADATA.httpCode, {}, Reflect);

      // Act
      middleware.use(req as Request, res as Response, next);

      // Assert
      expect(res.statusCode).toBe(201);
      expect(next).toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("should handle paths with trailing slashes correctly", () => {
      // Arrange
      req = {
        ...req,
        path: "/test/",
      };
      const statusCodeMapping = { "/test/-get": 200 };
      Reflect.defineMetadata(HTTP_CODE_METADATA.httpCode, statusCodeMapping, Reflect);

      // Act
      middleware.use(req as Request, res as Response, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(next).toHaveBeenCalled();
    });

    it("should handle paths with parameters correctly", () => {
      // Arrange
      req = {
        ...req,
        path: "/test/123",
      };
      const statusCodeMapping = { "/test/:id/-get": 200 };
      Reflect.defineMetadata(HTTP_CODE_METADATA.httpCode, statusCodeMapping, Reflect);

      // Act
      middleware.use(req as Request, res as Response, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(next).toHaveBeenCalled();
    });

    it("should handle unknown methods by setting a default status code", () => {
      // Arrange
      req.method = "UNKNOWN";
      Reflect.defineMetadata(HTTP_CODE_METADATA.httpCode, {}, Reflect);

      // Act
      middleware.use(req as Request, res as Response, next);

      // Assert
      expect(res.statusCode).toBe(200);
      expect(next).toHaveBeenCalled();
    });

    it("should handle global prefix correctly", () => {
      // Arrange
      middleware = new HttpStatusCodeMiddleware("/api");
      req = {
        ...req,
        path: "/api/test",
      };
      const statusCodeMapping = { "/test/-get": 200 };
      Reflect.defineMetadata(HTTP_CODE_METADATA.httpCode, statusCodeMapping, Reflect);

      // Act
      middleware.use(req as Request, res as Response, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(next).toHaveBeenCalled();
    });
  });
});

// End of unit tests for: use
