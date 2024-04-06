import "reflect-metadata";

import { BindingScopeEnum, Container, injectable } from "inversify";
import { beforeEach, describe, it, vi, expect, MockInstance } from "vitest";
import { AppFactory } from "../../application";
import { ProviderManager } from "../provider-manager";
import { Logger } from "../logger/logger.provider";

class MockLogger extends Logger {
  warn = vi.fn();
  error = vi.fn();
}

const container: Container = new Container();
container.bind(ProviderManager).toSelf();
container.bind(Logger).toConstantValue(new MockLogger());

vi.mock("../../application/application-factory.ts", () => ({
  AppFactory: {
    get container() {
      return container;
    },
  },
}));

describe("Provider Manager", () => {
  let providerManager: ProviderManager;
  let loggerSpy: MockInstance<any>;
  beforeEach(async () => {
    vi.clearAllMocks();

    loggerSpy = vi.spyOn(container.get(Logger), "warn");

    const { ProviderManager } = await import("../provider-manager");
    providerManager = new ProviderManager();
  });

  it("register a new service identifier", () => {
    const TestService = class {};
    providerManager.register(TestService, BindingScopeEnum.Singleton);
    expect(AppFactory.container.isBound(TestService)).toBe(true);
  });

  it("logs a warning if a service identifier is already registered", () => {
    const TestService = class {};
    providerManager.register(TestService, BindingScopeEnum.Singleton);
    providerManager.register(TestService, BindingScopeEnum.Singleton);

    const mockLogger = container.get(Logger) as MockLogger;

    expect(AppFactory.container.isBound(TestService)).toBe(true);
    mockLogger.warn(
      "Service identifier already registered",
      "provider-manager",
    );
    expect(mockLogger.warn).toHaveBeenCalledWith(
      "Service identifier already registered",
      "provider-manager",
    );
  });

  it("returns a service identifier", () => {
    @injectable()
    class TestService {}

    providerManager.register(TestService, BindingScopeEnum.Singleton);
    const service = providerManager.get(TestService);

    expect(service).toBeInstanceOf(TestService);
  });
});
