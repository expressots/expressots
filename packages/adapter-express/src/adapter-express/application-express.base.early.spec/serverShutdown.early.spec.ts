// Unit tests for: serverShutdown

import { ApplicationBase } from "../application-express.base";

export class ConcreteApplication extends ApplicationBase {
  protected globalConfiguration(): void | Promise<void> {}
  protected configureServices(): void | Promise<void> {}
  protected postServerInitialization(): void | Promise<void> {}

  protected async serverShutdown(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 100);
    });
  }

  public async callServerShutdown(): Promise<void> {
    return this.serverShutdown();
  }
}

describe("ApplicationBase.serverShutdown() serverShutdown method", () => {
  let app: ConcreteApplication;

  beforeEach(() => {
    app = new ConcreteApplication();
  });

  describe("Happy Path", () => {
    it("should resolve the promise indicating successful shutdown", async () => {
      await expect(app.callServerShutdown()).resolves.toBeUndefined();
    });
  });

  describe("Edge Cases", () => {
    it("should handle immediate resolution without delay", async () => {
      jest.spyOn(app as any, "serverShutdown").mockResolvedValueOnce(undefined);
      await expect(app.callServerShutdown()).resolves.toBeUndefined();
    });

    it("should handle rejection gracefully", async () => {
      jest.spyOn(app as any, "serverShutdown").mockRejectedValueOnce(new Error("Shutdown failed"));
      await expect(app.callServerShutdown()).rejects.toThrow("Shutdown failed");
    });
  });
});

// End of unit tests for: serverShutdown
