// Unit tests for: postServerInitialization

import { ApplicationBase } from "../application-express.base";

class ConcreteApplication extends ApplicationBase {
  protected globalConfiguration(): void | Promise<void> {}
  protected configureServices(): void | Promise<void> {}

  protected async postServerInitialization(): Promise<void> {
    console.log("Server initialized");
  }

  protected serverShutdown(): void | Promise<void> {}

  public async callPostServerInitialization(): Promise<void> {
    await this.postServerInitialization();
  }
}

describe("ApplicationBase.postServerInitialization() postServerInitialization method", () => {
  let app: ConcreteApplication;

  beforeEach(() => {
    app = new ConcreteApplication();
  });

  describe("Happy Path", () => {
    it("should execute postServerInitialization without errors", async () => {
      await expect(app.callPostServerInitialization()).resolves.toBeUndefined();
    });
  });

  describe("Edge Cases", () => {
    it("should handle asynchronous operations correctly", async () => {
      jest.spyOn(app as any, "postServerInitialization").mockResolvedValueOnce(undefined);
      await expect(app.callPostServerInitialization()).resolves.toBeUndefined();
    });

    it("should handle errors thrown within the method", async () => {
      const error = new Error("Initialization error");
      jest.spyOn(app as any, "postServerInitialization").mockRejectedValueOnce(error);
      await expect(app.callPostServerInitialization()).rejects.toThrow("Initialization error");
    });
  });
});

// End of unit tests for: postServerInitialization
