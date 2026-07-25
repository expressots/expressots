import express from "express";
import { RenderEngine } from "@expressots/shared";
import { AppExpress } from "../application-express";
import { setEngineEjs, setEngineHandlebars, setEnginePug } from "../render/engine";

jest.mock("../render/engine", () => {
  const actual = jest.requireActual("../render/engine");
  return {
    ...actual,
    setEngineEjs: jest.fn().mockResolvedValue(undefined),
    setEngineHandlebars: jest.fn().mockResolvedValue(undefined),
    setEnginePug: jest.fn().mockResolvedValue(undefined),
  };
});

describe("AppExpress.configEngine() method", () => {
  let appExpress: AppExpress;
  let app: express.Application;

  beforeEach(() => {
    appExpress = new AppExpress() as AppExpress;
    app = { set: jest.fn() } as unknown as express.Application;
    (appExpress as unknown as { app: express.Application }).app = app;
  });

  const configEngine = () =>
    (appExpress as unknown as { configEngine: () => Promise<void> }).configEngine();

  it("configures Handlebars when selected", async () => {
    (appExpress as unknown as { renderOptions: unknown }).renderOptions = {
      engine: RenderEngine.Engine.HBS,
      options: { viewsDir: "views" },
    };

    await configEngine();

    expect(setEngineHandlebars).toHaveBeenCalledWith(app, { viewsDir: "views" });
  });

  it("configures EJS when selected", async () => {
    (appExpress as unknown as { renderOptions: unknown }).renderOptions = {
      engine: RenderEngine.Engine.EJS,
      options: { viewsDir: "views" },
    };

    await configEngine();

    expect(setEngineEjs).toHaveBeenCalled();
  });

  it("configures Pug when selected", async () => {
    (appExpress as unknown as { renderOptions: unknown }).renderOptions = {
      engine: RenderEngine.Engine.PUG,
      options: { viewsDir: "views" },
    };

    await configEngine();

    expect(setEnginePug).toHaveBeenCalled();
  });

  it("throws for unsupported engines", async () => {
    (appExpress as unknown as { renderOptions: unknown }).renderOptions = {
      engine: "unknown",
    };

    await expect(configEngine()).rejects.toThrow("Unsupported engine type!");
  });
});
