import {
  BindingScopeEnum,
  Container,
  ContainerModule,
  interfaces,
} from "inversify";
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
import { AppContainer } from "../application-container";

interface ContainerOptions {
  defaultScope?: interfaces.BindingScope;
  skipBaseClassChecks?: boolean;
  autoBindInjectable?: boolean;
}

let spy: MockInstance;
let appContainerInstance: AppContainer;
let containerInstance: Container;
let containerModuleInstance: ContainerModule;

beforeEach(() => {
  appContainerInstance = new AppContainer();
  containerInstance = new Container();
  containerModuleInstance = new ContainerModule((bind) => {
    bind("Container").toConstantValue(containerInstance);
  });

  spy = vi.spyOn(appContainerInstance, "create");
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("Application Container", () => {
  it("create a container with options", () => {
    const options: ContainerOptions = {
      defaultScope: BindingScopeEnum.Singleton,
      autoBindInjectable: false,
      skipBaseClassChecks: true,
    };

    appContainerInstance = new AppContainer(options);
    appContainerInstance.create([containerModuleInstance]);
    expect(appContainerInstance.getContainerOptions()).toEqual(options);
  });

  it("create and return container instance with default options", () => {
    appContainerInstance.create([containerModuleInstance]);
    expect(spy).toHaveBeenCalledWith([containerModuleInstance]);
    expect(appContainerInstance.getContainerOptions()).toEqual({
      defaultScope: BindingScopeEnum.Request,
      autoBindInjectable: true,
      skipBaseClassChecks: false,
    });
  });

  it("create a container without autoBindInjectable option", () => {
    const options: ContainerOptions = {
      defaultScope: BindingScopeEnum.Singleton,
      skipBaseClassChecks: true,
    };

    appContainerInstance = new AppContainer(options);
    const container = appContainerInstance.create([containerModuleInstance]);

    expect(container).toBeInstanceOf(Container);
    expect(appContainerInstance.getContainerOptions()).toEqual({
      defaultScope: BindingScopeEnum.Singleton,
      autoBindInjectable: true, // This should default to true
      skipBaseClassChecks: true,
    });
  });

  it("create a container with autoBindInjectable set to true explicitly", () => {
    const options: ContainerOptions = {
      autoBindInjectable: true,
    };

    appContainerInstance = new AppContainer(options);
    const container = appContainerInstance.create([containerModuleInstance]);

    expect(container).toBeInstanceOf(Container);
    expect(appContainerInstance.getContainerOptions()).toEqual({
      defaultScope: BindingScopeEnum.Request,
      autoBindInjectable: true,
      skipBaseClassChecks: false,
    });
  });

  it("viewContainerBindings should output container bindings to the console", () => {
    const consoleTableSpy = vi
      .spyOn(console, "table")
      .mockImplementation(() => {});

    appContainerInstance = new AppContainer();
    appContainerInstance.create([containerModuleInstance]);

    appContainerInstance.viewContainerBindings();

    expect(consoleTableSpy).toHaveBeenCalled();

    consoleTableSpy.mockRestore();
  });

  it("should return the container instance", () => {
    const container = appContainerInstance.create([containerModuleInstance]);
    expect(appContainerInstance.Container).toBe(container);
  });
});
