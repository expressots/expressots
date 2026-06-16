// Unit tests for: globalConfiguration

import { ApplicationBase } from "../application-express.base";

class ConcreteApplication extends ApplicationBase {
  private config: any;

  constructor() {
    super();
    this.config = {};
  }

  protected globalConfiguration(): void {
    this.config = { setting: "value" };
  }

  protected async configureServices(): Promise<void> {}
  protected async postServerInitialization(): Promise<void> {}
  protected async serverShutdown(): Promise<void> {}

  public callGlobalConfiguration(): void {
    this.globalConfiguration();
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
    it("should set the global configuration correctly", () => {
      // Access indirectly via public method
      app.callGlobalConfiguration();
      expect(app.getConfig()).toEqual({ setting: "value" });
    });

    it("should update config when called explicitly", () => {
      const newApp = new (class extends ConcreteApplication {
        protected globalConfiguration(): void {
          this["config"] = { autoSet: true };
        }
      })();
      newApp.callGlobalConfiguration();
      expect(newApp.getConfig()).toEqual({ autoSet: true });
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty configuration gracefully", () => {
      const emptyConfigApp = new (class extends ConcreteApplication {
        protected globalConfiguration(): void {
          this["config"] = {}; // Access private attribute indirectly
        }
      })();

      emptyConfigApp.callGlobalConfiguration();
      expect(emptyConfigApp.getConfig()).toEqual({});
    });

    it("should handle synchronous operations correctly", () => {
      const syncConfigApp = new (class extends ConcreteApplication {
        protected globalConfiguration(): void {
          this["config"] = { syncSetting: "syncValue" };
        }
      })();

      syncConfigApp.callGlobalConfiguration();
      expect(syncConfigApp.getConfig()).toEqual({ syncSetting: "syncValue" });
    });
  });
});

// End of unit tests for: globalConfiguration
