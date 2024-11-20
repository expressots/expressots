// Unit tests for: viewMiddlewarePipeline

import { Middleware } from "../middleware-service";

// Mocking necessary functions
jest.mock("../middleware-resolver", () => {
  const actual = jest.requireActual("../middleware-resolver");
  return {
    ...actual,
    middlewareResolver: jest.fn(),
  };
});

jest.mock("../../error/error-handler-middleware", () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Mock interfaces and types
interface MockMiddlewarePipeline {
  timestamp: Date;
  middleware: any;
}

describe("Middleware.viewMiddlewarePipeline() viewMiddlewarePipeline method", () => {
  let middleware: Middleware;

  beforeEach(() => {
    middleware = new Middleware() as any;
  });

  describe("Happy Path", () => {
    it("should correctly format and display the middleware pipeline", () => {
      // Arrange
      const mockMiddlewarePipeline: MockMiddlewarePipeline[] = [
        {
          timestamp: new Date("2023-01-01T00:00:00Z"),
          middleware: jest.fn() as any,
        },
        {
          timestamp: new Date("2023-01-02T00:00:00Z"),
          middleware: jest.fn() as any,
        },
      ];
      jest
        .spyOn(middleware, "getMiddlewarePipeline" as any)
        .mockReturnValue(mockMiddlewarePipeline as any);

      // Act
      middleware.viewMiddlewarePipeline();

      // Assert
      // Here, you would check the console output or the formatted data
      // Since console.table is used, you might need to mock console.table
    });
  });

  describe("Edge Cases", () => {
    it("should handle an empty middleware pipeline gracefully", () => {
      // Arrange
      jest
        .spyOn(middleware, "getMiddlewarePipeline" as any)
        .mockReturnValue([] as any);

      // Act
      middleware.viewMiddlewarePipeline();

      // Assert
      // Check that no errors are thrown and the output is as expected
    });
  });
});

// End of unit tests for: viewMiddlewarePipeline
