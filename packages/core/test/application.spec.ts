import "reflect-metadata";
import express from "express";
import { Container, ContainerModule } from "inversify";
import {
  AppContainer,
  Application,
  ServerEnvironment,
} from "../src/application";
import { IApplicationMessageToConsole } from "../src/console";

describe("AppContainer", () => {
  it("creates a container", () => {
    // Arrange
    const appContainer = new AppContainer();
    const modules: ContainerModule[] = [];

    // Act
    vi.spyOn(appContainer, "create").mockImplementation(() => {
      return new Container();
    });

    const container = appContainer.create(modules);

    // Assert
    expect(appContainer.create).toHaveBeenCalledWith(modules);
    expect(container).toBeDefined();
  });
});

describe("Application", () => {
  it("creates an application express inversify server", () => {
    // Arrange
    const mockCreate = vi.fn().mockReturnValue({});
    const mockListen = vi.fn();
    const application = new Application();

    // Act
    vi.spyOn(application, "create").mockImplementation(mockCreate);
    vi.spyOn(application, "listen").mockImplementation(mockListen);

    const container = {} as Container;
    const middlewares = [] as express.RequestHandler[];
    const port = 8080;
    const environment = ServerEnvironment.Development;
    const consoleMessage = {} as IApplicationMessageToConsole;

    application.create(container, middlewares);
    application.listen(port, environment, consoleMessage);

    // Assert
    expect(application.create).toHaveBeenCalledWith(container, middlewares);
    expect(application.listen).toHaveBeenCalledWith(
      port,
      environment,
      consoleMessage,
    );
  });
});
