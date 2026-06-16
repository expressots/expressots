import { EventEmitter } from "events";
import { AppExpress } from "../application-express";

jest.mock("../studio/index.js", () => ({
  stopStudio: jest.fn().mockResolvedValue(undefined),
}));

describe("AppExpress.handleExit() shutdown path", () => {
  it("closes the HTTP server and destroys tracked connections", async () => {
    const appExpress = new AppExpress() as AppExpress;
    const socket = new EventEmitter() as import("net").Socket & { destroy: jest.Mock };
    socket.destroy = jest.fn();

    (appExpress as unknown as { activeConnections: Set<import("net").Socket> }).activeConnections =
      new Set([socket]);
    (appExpress as unknown as { shutdownTimeout: number }).shutdownTimeout = 50;
    (appExpress as unknown as { lifecycleRegistry: null }).lifecycleRegistry = null;

    const close = jest.fn((cb: (err?: Error) => void) => cb());
    (
      appExpress as unknown as {
        serverInstance: { close: typeof close; closeAllConnections?: () => void };
      }
    ).serverInstance = {
      close,
      closeAllConnections: jest.fn(),
    };

    await (
      appExpress as unknown as { handleExit: (signal?: NodeJS.Signals) => Promise<void> }
    ).handleExit("SIGTERM");

    expect(close).toHaveBeenCalled();
    expect(socket.destroy).toHaveBeenCalled();
  });
});
