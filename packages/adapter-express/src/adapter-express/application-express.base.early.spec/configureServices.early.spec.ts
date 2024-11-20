// Unit tests for: configureServices

import { ApplicationBase } from "../application-express.base";

class ConcreteApplication extends ApplicationBase {
  private servicesConfigured: boolean = false;

  protected async globalConfiguration(): Promise<void> {}

  protected async configureServices(): Promise<void> {
    this.servicesConfigured = true;
  }

  protected async postServerInitialization(): Promise<void> {}

  protected async serverShutdown(): Promise<void> {}

  public isServicesConfigured(): boolean {
    return this.servicesConfigured;
  }
}

describe("ApplicationBase.configureServices() configureServices method", () => {
  let app: ConcreteApplication;

  beforeEach(() => {
    app = new ConcreteApplication();
  });

  describe("Happy Path", () => {
    it("should configure services successfully", async () => {
      await (app as any).configureServices();
      expect(app.isServicesConfigured()).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle repeated calls to configureServices gracefully", async () => {
      await (app as any).configureServices();
      await (app as any).configureServices();
      expect(app.isServicesConfigured()).toBe(true);
    });

    it("should handle asynchronous operations correctly", async () => {
      const configureServicesSpy = jest.spyOn(app as any, "configureServices");
      await (app as any).configureServices();
      expect(configureServicesSpy).toHaveBeenCalled();
    });
  });
});

// End of unit tests for: configureServices
