import { AppExpress } from "../application-express";

describe("AppExpress.ensurePortAvailable()", () => {
  let appExpress: AppExpress;

  beforeEach(() => {
    appExpress = new AppExpress();
  });

  it("returns true immediately when the port is already free", async () => {
    jest
      .spyOn(
        appExpress as unknown as { isPortAvailable: (port: number) => Promise<boolean> },
        "isPortAvailable",
      )
      .mockResolvedValue(true);

    await expect(
      (
        appExpress as unknown as { ensurePortAvailable: (port: number) => Promise<boolean> }
      ).ensurePortAvailable(3000),
    ).resolves.toBe(true);
  });

  it("retries after killing the process occupying the port", async () => {
    const isPortAvailable = jest
      .spyOn(
        appExpress as unknown as { isPortAvailable: (port: number) => Promise<boolean> },
        "isPortAvailable",
      )
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const killProcessOnPort = jest
      .spyOn(
        appExpress as unknown as { killProcessOnPort: (port: number) => Promise<boolean> },
        "killProcessOnPort",
      )
      .mockResolvedValue(true);
    jest
      .spyOn(appExpress as unknown as { delay: (ms: number) => Promise<void> }, "delay")
      .mockResolvedValue(undefined);

    await expect(
      (
        appExpress as unknown as { ensurePortAvailable: (port: number) => Promise<boolean> }
      ).ensurePortAvailable(3000),
    ).resolves.toBe(true);

    expect(killProcessOnPort).toHaveBeenCalledWith(3000);
    expect(isPortAvailable).toHaveBeenCalledTimes(2);
  });

  it("re-kills on the third retry attempt when the port stays busy", async () => {
    (appExpress as unknown as { portRetryAttempts: number }).portRetryAttempts = 3;
    jest
      .spyOn(
        appExpress as unknown as { isPortAvailable: (port: number) => Promise<boolean> },
        "isPortAvailable",
      )
      .mockResolvedValue(false);
    const killProcessOnPort = jest
      .spyOn(
        appExpress as unknown as { killProcessOnPort: (port: number) => Promise<boolean> },
        "killProcessOnPort",
      )
      .mockResolvedValue(true);
    jest
      .spyOn(appExpress as unknown as { delay: (ms: number) => Promise<void> }, "delay")
      .mockResolvedValue(undefined);

    await expect(
      (
        appExpress as unknown as { ensurePortAvailable: (port: number) => Promise<boolean> }
      ).ensurePortAvailable(3000),
    ).resolves.toBe(false);

    expect(killProcessOnPort).toHaveBeenCalledTimes(2);
  });
});

describe("AppExpress.handleSyncOrAsync()", () => {
  it("awaits promise results from lifecycle hooks", async () => {
    const appExpress = new AppExpress();
    let resolved = false;

    await (
      appExpress as unknown as {
        handleSyncOrAsync: (result: void | Promise<void>) => Promise<void>;
      }
    ).handleSyncOrAsync(
      Promise.resolve().then(() => {
        resolved = true;
      }),
    );

    expect(resolved).toBe(true);
  });
});
