import { describe, it, expect, vi, beforeEach } from "vitest";
import { Middleware } from "../middleware-service";
import express from "express";

vi.mock("express", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as typeof express),
    default: actual,
    json: vi.fn(() => "mockedJsonMiddleware"),
  };
});

describe("Middleware", () => {
  let middleware: Middleware;

  beforeEach(() => {
    middleware = new Middleware();
  });

  it("should add a JSON body parser middleware if not exists", () => {
    middleware.addBodyParser();

    const pipeline = middleware.getMiddlewarePipeline();
    expect(pipeline).toHaveLength(1);
  });

  it("should not add a JSON body parser middleware if already exists", () => {
    middleware.addBodyParser();
    middleware.addBodyParser();

    const pipeline = middleware.getMiddlewarePipeline();
    expect(pipeline).toHaveLength(1);
  });

  it("should add a URL encoded parser middleware if not exists", () => {
    middleware.addUrlEncodedParser();

    const pipeline = middleware.getMiddlewarePipeline();
    expect(pipeline).toHaveLength(1);
  });

  it("should not add a URL encoded parser middleware if already exists", () => {
    middleware.addUrlEncodedParser();
    middleware.addUrlEncodedParser();

    const pipeline = middleware.getMiddlewarePipeline();
    expect(pipeline).toHaveLength(1);
  });

  it("should set the provided error handler", () => {
    const customErrorHandler = vi.fn();
    middleware.setErrorHandler({ errorHandler: customErrorHandler });

    expect(middleware.getErrorHandler()).toBe(customErrorHandler);
  });

  it("should return the default error handler if not set", () => {
    expect(middleware.getErrorHandler()).toBeUndefined();
  });
});
