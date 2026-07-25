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

  it("runs lifecycle shutdown hooks when a registry is configured", async () => {
    const appExpress = new AppExpress() as AppExpress;
    const executeShutdown = jest.fn().mockResolvedValue(undefined);
    (
      appExpress as unknown as { lifecycleRegistry: { executeShutdown: typeof executeShutdown } }
    ).lifecycleRegistry = { executeShutdown };
    (appExpress as unknown as { shutdownTimeout: number }).shutdownTimeout = 50;
    (appExpress as unknown as { serverInstance: null }).serverInstance = null;

    await (
      appExpress as unknown as { handleExit: (signal?: NodeJS.Signals) => Promise<void> }
    ).handleExit("SIGINT");

    expect(executeShutdown).toHaveBeenCalledWith("SIGINT");
  });

  it("force-closes the server when close does not resolve promptly", async () => {
    const appExpress = new AppExpress() as AppExpress;
    const socket = new EventEmitter() as import("net").Socket & { destroy: jest.Mock };
    socket.destroy = jest.fn();
    (appExpress as unknown as { activeConnections: Set<import("net").Socket> }).activeConnections =
      new Set([socket]);
    (appExpress as unknown as { shutdownTimeout: number }).shutdownTimeout = 15;
    (appExpress as unknown as { lifecycleRegistry: null }).lifecycleRegistry = null;
    (appExpress as unknown as { serverShutdown: () => Promise<void> }).serverShutdown = async () =>
      undefined;
    (appExpress as unknown as { serverInstance: { close: jest.Mock } }).serverInstance = {
      close: jest.fn(),
    };

    const exitPromise = (appExpress as unknown as { handleExit: () => Promise<void> }).handleExit();
    await new Promise((resolve) => setTimeout(resolve, 20));
    await exitPromise;

    expect(socket.destroy).toHaveBeenCalled();
  });
});
