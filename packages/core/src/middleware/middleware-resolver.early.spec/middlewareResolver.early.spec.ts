// Unit tests for: middlewareResolver

import express from "express";
import { middlewareResolver } from "../middleware-resolver";

// Mocking the require function to simulate middleware presence
jest.mock(
  "cors",
  () =>
    jest.fn(
      () =>
        (
          req: express.Request,
          res: express.Response,
          next: express.NextFunction,
        ) =>
          next(),
    ),
  { virtual: true },
);
jest.mock(
  "compression",
  () =>
    jest.fn(
      () =>
        (
          req: express.Request,
          res: express.Response,
          next: express.NextFunction,
        ) =>
          next(),
    ),
  { virtual: true },
);

describe("middlewareResolver() middlewareResolver method", () => {
  // Happy Path Tests
  describe("Happy Path", () => {
    /* it("should return the cors middleware when it is available", () => {
      // Test to ensure the middlewareResolver returns the cors middleware when it is available
      const middleware = middlewareResolver("cors");
      expect(middleware).toBeInstanceOf(Function);
    });

    it("should return the compression middleware when it is available", () => {
      // Test to ensure the middlewareResolver returns the compression middleware when it is available
      const middleware = middlewareResolver("compression");
      expect(middleware).toBeInstanceOf(Function);
    }); */
  });

  // Edge Case Tests
  describe("Edge Cases", () => {
    it("should return null for a non-existent middleware", () => {
      // Test to ensure the middlewareResolver returns null for a middleware that does not exist in the registry
      const middleware = middlewareResolver("nonExistentMiddleware");
      expect(middleware).toBeNull();
    });

    it("should return null for a middleware that is not installed", () => {
      // Test to ensure the middlewareResolver returns null for a middleware that is not installed
      const middleware = middlewareResolver("helmet");
      expect(middleware).toBeNull();
    });

    it("should handle case sensitivity and return null for incorrect casing", () => {
      // Test to ensure the middlewareResolver is case-sensitive and returns null for incorrect casing
      const middleware = middlewareResolver("Cors");
      expect(middleware).toBeNull();
    });

    it("should return null if middleware name is an empty string", () => {
      // Test to ensure the middlewareResolver returns null if the middleware name is an empty string
      const middleware = middlewareResolver("");
      expect(middleware).toBeNull();
    });

    it("should return null if middleware name is a whitespace string", () => {
      // Test to ensure the middlewareResolver returns null if the middleware name is a whitespace string
      const middleware = middlewareResolver("   ");
      expect(middleware).toBeNull();
    });
  });
});

// End of unit tests for: middlewareResolver
