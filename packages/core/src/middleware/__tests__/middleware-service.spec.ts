import { describe, it, expect, beforeEach, vi } from "vitest";
import { IMiddleware, Middleware } from "../middleware-service";
import { Container } from "inversify";

vi.mock("express", () => ({
  json: vi.fn(() => vi.fn()),
  Router: () => ({
    use: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
  }),
  static: vi.fn(() => "expressStaticMock"),
}));

vi.mock("../../provider/logger/logger.provider", () => ({
  Logger: vi.fn().mockImplementation(() => ({
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("../middleware-resolver", () => ({
  middlewareResolver: vi.fn().mockReturnValue(vi.fn()),
}));

let middlewareManager: Middleware;
let container: Container;

beforeEach(() => {
  container = new Container();
  container.bind<IMiddleware>(Middleware).toSelf();
  middlewareManager = container.get(Middleware);
});

describe("Middleware Service", () => {
  it("successfully adds and retrieves middleware", () => {
    const testMiddleware = (req, res, next) => next();
    middlewareManager.addMiddleware(testMiddleware);

    const pipeline = middlewareManager.getMiddlewarePipeline();
    expect(pipeline).toHaveLength(1);
    expect(pipeline[0].middleware).toBe(testMiddleware);
  });

  it("prevents duplicate middleware from being added", () => {
    const testMiddleware = (req, res, next) => next();
    middlewareManager.addMiddleware(testMiddleware);
    middlewareManager.addMiddleware(testMiddleware);

    const pipeline = middlewareManager.getMiddlewarePipeline();
    expect(pipeline).toHaveLength(1);
  });

  it("returns the error handler middleware", () => {
    const customErrorHandler = vi.fn((err, req, res, next) => next());
    middlewareManager.setErrorHandler(customErrorHandler);

    const errorHandler = middlewareManager.getErrorHandler();

    expect(errorHandler).toBe(customErrorHandler);
  });

  it("return an empty array if no middleware is added", () => {
    const pipeline = middlewareManager.getMiddlewarePipeline();
    expect(pipeline).toHaveLength(0);
  });

  it("return a single middleware if only one is added", () => {
    const testMiddleware = (req, res, next) => next();
    middlewareManager.addMiddleware(testMiddleware);

    const pipeline = middlewareManager.getMiddlewarePipeline();
    expect(pipeline).toHaveLength(1);
  });

  it("retrieves pipeline in the order were added", () => {
    const now = Date.now();
    const middlewares = [
      { timestamp: new Date(now + 1000), middleware: () => {} },
      { timestamp: new Date(now), middleware: () => {} },
    ];

    middlewareManager["middlewarePipeline"].push(
      middlewares[1],
      middlewares[0],
    );

    const sortedPipeline = middlewareManager.getMiddlewarePipeline();

    expect(sortedPipeline).toHaveLength(2);
    expect(sortedPipeline[0].timestamp.getTime()).toBeLessThan(
      sortedPipeline[1].timestamp.getTime(),
    );
  });
});
