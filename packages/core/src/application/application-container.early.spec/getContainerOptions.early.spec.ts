// Unit tests for: getContainerOptions

import "reflect-metadata";
import { BindingScopeEnum, interfaces } from "../../di/inversify";
import { Logger } from "../../provider";
import { AppContainer } from "../application-container";

// Mocking the buildProviderModule function
jest.mock("../../di/binding-decorator", () => {
  const actual = jest.requireActual("../../di/binding-decorator");
  return {
    ...actual,
    buildProviderModule: jest.fn(),
    __esModule: true,
  };
});

// Mocking the Container class
class MockContainer {
  public options: interfaces.ContainerOptions = {
    defaultScope: BindingScopeEnum.Request,
    autoBindInjectable: true,
  };
  public bind = jest.fn();
  public load = jest.fn();
  public _bindingDictionary = {
    _map: new Map(),
  };
}

describe("AppContainer.getContainerOptions() getContainerOptions method", () => {
  let mockContainer: MockContainer;
  let appContainer: AppContainer;

  beforeEach(() => {
    mockContainer = new MockContainer() as any;
    appContainer = new AppContainer() as any;
    appContainer["container"] = mockContainer as any;
    appContainer["logger"] = new Logger() as any;
  });

  describe("Happy Path", () => {
    it("should return the container options when the container is created", () => {
      // Test to ensure the method returns the container options correctly
      const options = appContainer.getContainerOptions();
      expect(options).toEqual(mockContainer.options);
    });
  });

  describe("Edge Cases", () => {
    it("should log an error and return undefined if the container is not created", () => {
      // Test to ensure the method handles the case where the container is not created
      appContainer["container"] = undefined as any;
      const options = appContainer.getContainerOptions();
      expect(options).toBeUndefined();
    });
  });
});

// End of unit tests for: getContainerOptions
