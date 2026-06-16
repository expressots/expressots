import { AppExpress } from "../application-express";

describe("AppExpress.getPort() method", () => {
  it("returns the bound port from the server address", async () => {
    const appExpress = new AppExpress() as AppExpress;
    (
      appExpress as unknown as { serverInstance: { address: () => { port: number } } }
    ).serverInstance = {
      address: () => ({ port: 3456 }),
    };

    await expect(appExpress.getPort()).resolves.toBe(3456);
  });

  it("throws when the server address is unavailable", async () => {
    const appExpress = new AppExpress() as AppExpress;
    (appExpress as unknown as { serverInstance: { address: () => null } }).serverInstance = {
      address: () => null,
    };

    await expect(appExpress.getPort()).rejects.toThrow("Unable to determine server port");
  });
});
