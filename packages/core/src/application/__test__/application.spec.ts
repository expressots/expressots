import "reflect-metadata";

import { BindingScopeEnum, Container } from "inversify";
import { describe, expect, it } from "vitest";
import { AppContainer } from "../app-container";
import { CreateModule } from "../../container-module/container-module";

describe("App Container", () => {
  it("Create an App container", () => {
    const appContainer: AppContainer = new AppContainer();
    expect(appContainer).to.be.instanceOf(AppContainer);
  });

  it("Create a container with default configuration", () => {
    const appContainer: AppContainer = new AppContainer();
    const container = appContainer.create([]);
    expect(container).to.be.instanceOf(Container);
    expect(appContainer.getContainerOptions()).to.be.deep.equal({
      autoBindInjectable: true,
      defaultScope: "Request",
      skipBaseClassChecks: false,
    });
  });

  it("Create a container with custom configuration", () => {
    const appContainer: AppContainer = new AppContainer({
      defaultScope: BindingScopeEnum.Singleton,
    });
    const container = appContainer.create([]);
    expect(container).to.be.instanceOf(Container);
    expect(appContainer.getContainerOptions()).to.be.deep.equal({
      autoBindInjectable: true,
      defaultScope: "Singleton",
      skipBaseClassChecks: false,
    });
  });

  it("Return a container", () => {
    const appContainer: AppContainer = new AppContainer();
    const container = appContainer.create([]);
    expect(appContainer.Container).to.be.equal(container);
  });

  it("Add a module to the container", () => {
    const appContainer: AppContainer = new AppContainer();
    const UserModule = CreateModule([]);
    const container = appContainer.create([UserModule]);
    expect(container).to.be.instanceOf(Container);
  });
});
