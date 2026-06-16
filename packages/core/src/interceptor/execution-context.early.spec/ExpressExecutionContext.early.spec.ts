import {
  ExpressExecutionContext,
  createExecutionContext,
} from "../execution-context";
import type { Container, interfaces } from "../../di/inversify";
import type { Request, Response } from "express";

describe("ExpressExecutionContext", () => {
  // Mock objects
  const mockRequest = {
    method: "GET",
    path: "/test/path",
    params: { id: "123" },
    query: { page: "1" },
  } as unknown as Request;

  const mockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as Response;

  const mockContainer = {
    get: jest.fn().mockReturnValue({ service: "mock" }),
  } as unknown as Container;

  class MockController {}

  describe("constructor and getters", () => {
    let context: ExpressExecutionContext;

    beforeEach(() => {
      context = new ExpressExecutionContext(
        mockRequest,
        mockResponse,
        mockContainer,
        MockController,
        "testMethod",
      );
    });

    it("should return the request via getRequest()", () => {
      expect(context.getRequest()).toBe(mockRequest);
    });

    it("should return the response via getResponse()", () => {
      expect(context.getResponse()).toBe(mockResponse);
    });

    it("should return the container via getContainer()", () => {
      expect(context.getContainer()).toBe(mockContainer);
    });

    it("should return the controller class via getClass()", () => {
      expect(context.getClass()).toBe(MockController);
    });

    it("should return the handler name via getHandler()", () => {
      expect(context.getHandler()).toBe("testMethod");
    });
  });

  describe("getRoute()", () => {
    it("should return route information from request", () => {
      const context = new ExpressExecutionContext(
        mockRequest,
        mockResponse,
        mockContainer,
        MockController,
        "testMethod",
      );

      const route = context.getRoute();

      expect(route.path).toBe("/test/path");
      expect(route.method).toBe("GET");
      expect(route.params).toEqual({ id: "123" });
      expect(route.query).toEqual({ page: "1" });
    });
  });

  describe("getScoped()", () => {
    it("should resolve service from container", () => {
      const context = new ExpressExecutionContext(
        mockRequest,
        mockResponse,
        mockContainer,
        MockController,
        "testMethod",
      );

      const result = context.getScoped(
        "TestService" as interfaces.ServiceIdentifier<unknown>,
      );

      expect(mockContainer.get).toHaveBeenCalled();
      expect(result).toEqual({ service: "mock" });
    });
  });

  describe("getData() and setData()", () => {
    it("should store and retrieve data by key", () => {
      const context = new ExpressExecutionContext(
        mockRequest,
        mockResponse,
        mockContainer,
        MockController,
        "testMethod",
      );

      context.setData("testKey", { value: "testValue" });
      const result = context.getData<{ value: string }>("testKey");

      expect(result).toEqual({ value: "testValue" });
    });

    it("should return undefined for non-existent key", () => {
      const context = new ExpressExecutionContext(
        mockRequest,
        mockResponse,
        mockContainer,
        MockController,
        "testMethod",
      );

      const result = context.getData("nonExistent");

      expect(result).toBeUndefined();
    });

    it("should overwrite existing data", () => {
      const context = new ExpressExecutionContext(
        mockRequest,
        mockResponse,
        mockContainer,
        MockController,
        "testMethod",
      );

      context.setData("key", "first");
      context.setData("key", "second");
      const result = context.getData("key");

      expect(result).toBe("second");
    });
  });
});

describe("createExecutionContext", () => {
  it("should create an ExpressExecutionContext instance", () => {
    const mockRequest = { method: "POST", path: "/api" } as unknown as Request;
    const mockResponse = {} as unknown as Response;
    const mockContainer = { get: jest.fn() } as unknown as Container;
    class TestController {}

    const context = createExecutionContext(
      mockRequest,
      mockResponse,
      mockContainer,
      TestController,
      "handler",
    );

    expect(context).toBeInstanceOf(ExpressExecutionContext);
    expect(context.getRequest()).toBe(mockRequest);
    expect(context.getHandler()).toBe("handler");
  });
});
