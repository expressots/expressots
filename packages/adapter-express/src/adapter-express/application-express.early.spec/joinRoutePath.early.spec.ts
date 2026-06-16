import express from "express";
import { AppExpress } from "../application-express";

describe("AppExpress.joinRoutePath() method", () => {
  let appExpress: AppExpress;

  beforeEach(() => {
    appExpress = new AppExpress() as AppExpress;
    (appExpress as unknown as { app: express.Application }).app = {
      use: jest.fn(),
    } as unknown as express.Application;
  });

  const join = (basePath: string, routePath: string | undefined): string =>
    (
      appExpress as unknown as {
        joinRoutePath: (base: string, route: string | undefined) => string;
      }
    ).joinRoutePath(basePath, routePath);

  it("normalises base paths and combines route segments", () => {
    expect(join("users", "profile")).toBe("/users/profile");
    expect(join("/users", "/profile")).toBe("/users/profile");
    expect(join("/users/", "/")).toBe("/users/");
    expect(join("", "/health")).toBe("/health");
  });

  it("collapses repeated slashes", () => {
    expect(join("/api/", "//status")).toBe("/api/status");
  });
});
