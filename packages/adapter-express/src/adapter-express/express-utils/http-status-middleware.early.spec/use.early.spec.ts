import "reflect-metadata";
import type { Request, Response } from "express";
import { HTTP_CODE_METADATA } from "../constants";
import { HttpStatusCodeMiddleware } from "../http-status-middleware";

describe("HttpStatusCodeMiddleware", () => {
  beforeEach(() => {
    Reflect.defineMetadata(
      HTTP_CODE_METADATA.httpCode,
      {
        "/items/-get": 206,
        "/users/:id/-get": 200,
      },
      Reflect,
    );
  });

  it("applies explicit status codes and disables freshness for non-200 codes", () => {
    const middleware = new HttpStatusCodeMiddleware("/");
    const req = {
      method: "GET",
      path: "/items",
      headers: { "if-none-match": '"abc"' },
    } as Request;
    const res = { status: jest.fn().mockReturnThis(), statusCode: 200 } as unknown as Response;
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(res.status).toHaveBeenCalledWith(206);
    expect(Object.getOwnPropertyDescriptor(req, "fresh")?.get?.()).toBe(false);
    expect(next).toHaveBeenCalled();
  });

  it("matches parameterized routes and applies default POST status codes", () => {
    const middleware = new HttpStatusCodeMiddleware("/");
    const req = { method: "POST", path: "/missing", headers: {} } as Request;
    const res = { status: jest.fn(), statusCode: 200 } as unknown as Response;

    middleware.use(req, res, jest.fn());

    expect(res.statusCode).toBe(201);
  });

  it("strips conditional headers when req.fresh cannot be overridden", () => {
    const middleware = new HttpStatusCodeMiddleware("/");
    const req = {
      method: "GET",
      path: "/items",
      headers: { "if-none-match": '"abc"', "if-modified-since": "today" },
    } as Request;
    Object.defineProperty(req, "fresh", {
      configurable: false,
      value: true,
    });

    const res = { status: jest.fn().mockReturnThis(), statusCode: 200 } as unknown as Response;
    middleware.use(req, res, jest.fn());

    expect(req.headers["if-none-match"]).toBeUndefined();
    expect(req.headers["if-modified-since"]).toBeUndefined();
  });
});
