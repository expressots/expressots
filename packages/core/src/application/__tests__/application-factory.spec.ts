import "reflect-metadata";
import {
  MockInstance,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { Container } from "inversify";
import { AppFactory } from "../application-factory";

interface IHandlebars {
  extName: string;
  viewPath: string;
  engine: any;
}

type RenderTemplateOptions = IHandlebars;

export interface IWebServer {
  configure(container: Container): Promise<void>;
  listen(port: number, environment: string, consoleMessage?: {}): Promise<void>;
  setEngine<T extends RenderTemplateOptions>(options: T): void;
}

class AppExpress implements IWebServer {
  public async configure(container: Container): Promise<void> {
    return;
  }

  public async listen(
    port: number,
    environment: string,
    consoleMessage?: {},
  ): Promise<void> {
    return;
  }

  public setEngine<T extends RenderTemplateOptions>(options: T): void {
    return;
  }
}

class MockLogger {
  error = vi.fn();
}

let spy: any;
let containerInstance: Container;

beforeEach(() => {
  containerInstance = new Container();
  spy = vi.spyOn(AppFactory, "create");
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("Application Factory", () => {
  it("create and return web server instance", async () => {
    const serverInstance = await AppFactory.create(
      containerInstance,
      AppExpress,
    );

    expect(serverInstance).toBeDefined();
  });

  it("should throw an error when given an invalid web server type", async () => {
    (AppFactory as any).logger = new MockLogger();

    try {
      await AppFactory.create(containerInstance, {} as any);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe("Invalid web server type.");
    }

    expect((AppFactory as any).logger.error).toHaveBeenCalledWith(
      "Invalid web server type.",
      "app-factory:create",
    );
  });
});
