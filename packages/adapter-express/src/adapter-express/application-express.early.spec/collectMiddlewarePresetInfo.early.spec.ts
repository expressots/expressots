import express from "express";
import { AppExpress } from "../application-express";

describe("AppExpress.collectMiddlewarePresetInfo() method", () => {
  let appExpress: AppExpress;

  beforeEach(() => {
    appExpress = new AppExpress() as AppExpress;
    (appExpress as unknown as { app: express.Application }).app = {
      use: jest.fn(),
    } as unknown as express.Application;
  });

  const collect = (): unknown =>
    (
      appExpress as unknown as {
        collectMiddlewarePresetInfo: () => unknown;
      }
    ).collectMiddlewarePresetInfo();

  it("returns undefined when getLastAppliedPreset is unavailable", () => {
    Object.defineProperty(appExpress, "Middleware", {
      configurable: true,
      get: () => ({}),
    });
    expect(collect()).toBeUndefined();
  });

  it("transforms the last applied preset into the Studio shape", () => {
    Object.defineProperty(appExpress, "Middleware", {
      configurable: true,
      get: () => ({
        getLastAppliedPreset: () => ({
          name: "api",
          hasOverrides: true,
          config: {
            parse: {
              json: { limit: "2mb" },
              urlencoded: { limit: "1mb", extended: true },
              cookies: true,
            },
            security: "strict",
            compress: { level: 6 },
            logger: { implementation: "pino" },
          },
        }),
      }),
    });

    expect(collect()).toEqual({
      name: "api",
      hasOverrides: true,
      parse: {
        json: { limit: "2mb" },
        urlencoded: { limit: "1mb", extended: true },
        cookies: true,
      },
      security: expect.objectContaining({
        tier: "strict",
        helmet: true,
      }),
      compress: { enabled: true, level: 6 },
      logger: { enabled: true, implementation: "pino" },
    });
  });

  it("maps explicit security objects into the Studio preset shape", () => {
    Object.defineProperty(appExpress, "Middleware", {
      configurable: true,
      get: () => ({
        getLastAppliedPreset: () => ({
          name: "custom",
          hasOverrides: false,
          config: {
            security: {
              headers: true,
              cors: { origin: "https://example.com", credentials: true },
              rateLimit: { windowMs: 1000, max: 10 },
            },
            compress: false,
            logger: false,
          },
        }),
      }),
    });

    expect(collect()).toEqual(
      expect.objectContaining({
        name: "custom",
        security: expect.objectContaining({
          cors: expect.objectContaining({ origin: "https://example.com" }),
          rateLimit: { windowMs: 1000, max: 10 },
        }),
        compress: { enabled: false },
        logger: { enabled: false },
      }),
    );
  });
});
