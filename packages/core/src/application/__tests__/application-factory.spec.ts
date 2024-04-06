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

// TODO: How to test external libraries such as '@expressots/adapter-express'?

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

let spy: MockInstance;
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
});
