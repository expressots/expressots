// Unit tests for: globalConfiguration

import { ApplicationBase } from "../application-express.base";

class ConcreteApplication extends ApplicationBase {
  private config: any;

  constructor() {
    super();
    this.config = {};
  }

  protected async globalConfiguration(): Promise<void> {
    this.config = { setting: "value" };
  }

  protected async configureServices(): Promise<void> {}
  protected async postServerInitialization(): Promise<void> {}
  protected async serverShutdown(): Promise<void> {}

  public async callGlobalConfiguration(): Promise<void> {
    await this.globalConfiguration();
  }

  public getConfig(): any {
    return this.config;
  }
}

describe("ApplicationBase.globalConfiguration() globalConfiguration method", () => {
  let app: ConcreteApplication;

  beforeEach(() => {
    app = new ConcreteApplication();
  });

  describe("Happy Path", () => {
    it("should set the global configuration correctly", async () => {
      // Access indirectly via public method
      await app.callGlobalConfiguration();
      expect(app.getConfig()).toEqual({ setting: "value" });
    });
  });

  describe("Edge Cases", () => {
    it("should handle asynchronous operations correctly", async () => {
      const asyncConfigApp = new (class extends ConcreteApplication {
        protected async globalConfiguration(): Promise<void> {
          return new Promise((resolve) => {
            setTimeout(() => {
              this["config"] = { asyncSetting: "asyncValue" }; // Access private attribute indirectly
              resolve();
            }, 100);
          });
        }
      })();

      await asyncConfigApp.callGlobalConfiguration();
      expect(asyncConfigApp.getConfig()).toEqual({ asyncSetting: "asyncValue" });
    });

    it("should handle empty configuration gracefully", async () => {
      const emptyConfigApp = new (class extends ConcreteApplication {
        protected async globalConfiguration(): Promise<void> {
          this["config"] = {}; // Access private attribute indirectly
        }
      })();

      await emptyConfigApp.callGlobalConfiguration();
      expect(emptyConfigApp.getConfig()).toEqual({});
    });
  });
});

// End of unit tests for: globalConfiguration
