import {
  initializeStudio,
  stopStudio,
  isStudioEnabled,
  getStudioAgent,
  reportStudioRuntimeInfo,
  rescanStudioRoutes,
  refreshStudioContainer,
} from "./studio-integration";

const mockAgent = {
  start: jest.fn().mockResolvedValue(undefined),
  stop: jest.fn().mockResolvedValue(undefined),
  createMiddleware: jest
    .fn()
    .mockReturnValue((_req: unknown, _res: unknown, next: () => void) => next()),
  scanRoutes: jest.fn().mockResolvedValue(undefined),
  updateRuntimeInfo: jest.fn(),
  refreshContainer: jest.fn(),
};

jest.mock("@expressots/studio-agent", () => ({
  StudioAgent: jest.fn().mockImplementation(() => mockAgent),
}));

describe("studio-integration", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await stopStudio();
    process.env = originalEnv;
  });

  it("returns false when explicitly disabled via config", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fakeApp: any = { use: jest.fn() };
    const result = await initializeStudio(fakeApp, { enabled: false });

    expect(result).toBe(false);
    expect(isStudioEnabled()).toBe(false);
    expect(getStudioAgent()).toBeNull();
  });

  it("returns false when EXPRESSOTS_STUDIO=false", async () => {
    process.env.EXPRESSOTS_STUDIO = "false";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fakeApp: any = { use: jest.fn() };
    const result = await initializeStudio(fakeApp);

    expect(result).toBe(false);
    expect(isStudioEnabled()).toBe(false);
  });

  it("returns false when not in development and not explicitly enabled", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.EXPRESSOTS_STUDIO;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fakeApp: any = { use: jest.fn() };
    const result = await initializeStudio(fakeApp);

    expect(result).toBe(false);
  });

  it("returns true in development when studio-agent is available", async () => {
    process.env.NODE_ENV = "development";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fakeApp: any = { use: jest.fn() };
    const result = await initializeStudio(fakeApp);

    expect(result).toBe(true);
    expect(isStudioEnabled()).toBe(true);
  });

  it("stopStudio() is safe to call when no agent is running", async () => {
    await expect(stopStudio()).resolves.toBeUndefined();
    expect(isStudioEnabled()).toBe(false);
  });

  it("initializes Studio in development when studio-agent is available", async () => {
    process.env.NODE_ENV = "development";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fakeApp: any = { use: jest.fn() };

    const started = await initializeStudio(fakeApp, { port: 3456, serviceName: "test-app" });

    expect(started).toBe(true);
    expect(isStudioEnabled()).toBe(true);
    expect(getStudioAgent()).not.toBeNull();
    expect(fakeApp.use).toHaveBeenCalled();
    expect(mockAgent.start).toHaveBeenCalled();
  });

  it("forwards runtime info to the agent when supported", async () => {
    process.env.NODE_ENV = "development";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fakeApp: any = { use: jest.fn() };
    await initializeStudio(fakeApp, { enabled: true });

    reportStudioRuntimeInfo({
      appPort: 3000,
      globalPrefix: "/api",
      runtimeItems: { providers: [{ name: "LoggerProvider" }] },
    });

    expect(mockAgent.updateRuntimeInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        appPort: 3000,
        globalPrefix: "/api",
      }),
    );
  });

  it("rescans routes and refreshes the container best-effort", async () => {
    process.env.NODE_ENV = "development";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fakeApp: any = { use: jest.fn() };
    await initializeStudio(fakeApp, { enabled: true });

    await rescanStudioRoutes();
    refreshStudioContainer();

    expect(mockAgent.scanRoutes).toHaveBeenCalled();
    expect(mockAgent.refreshContainer).toHaveBeenCalled();
  });

  it("no-ops runtime helpers when Studio is not running", async () => {
    await stopStudio();
    reportStudioRuntimeInfo({ appPort: 3000 });
    await rescanStudioRoutes();
    refreshStudioContainer();
    expect(mockAgent.updateRuntimeInfo).not.toHaveBeenCalled();
  });

  it("logs debug output when EXPRESSOTS_STUDIO_DEBUG is true", async () => {
    process.env.NODE_ENV = "development";
    process.env.EXPRESSOTS_STUDIO_DEBUG = "true";
    const debugSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fakeApp: any = { use: jest.fn() };

    await initializeStudio(fakeApp, { enabled: true });

    expect(debugSpy).toHaveBeenCalled();
    debugSpy.mockRestore();
  });

  it("warns when route rescan fails", async () => {
    process.env.NODE_ENV = "development";
    mockAgent.scanRoutes.mockRejectedValueOnce(new Error("scan failed"));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fakeApp: any = { use: jest.fn() };
    await initializeStudio(fakeApp, { enabled: true });

    await rescanStudioRoutes();

    expect(mockAgent.scanRoutes).toHaveBeenCalled();
  });

  it("replaces a previously running agent before re-initializing", async () => {
    process.env.NODE_ENV = "development";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fakeApp: any = { use: jest.fn() };
    await initializeStudio(fakeApp, { enabled: true });
    await initializeStudio(fakeApp, { enabled: true });

    expect(mockAgent.stop).toHaveBeenCalled();
  });

  it("returns false when the agent cannot bind its WebSocket port", async () => {
    process.env.NODE_ENV = "development";
    mockAgent.start.mockRejectedValueOnce(
      Object.assign(new Error("port in use"), { code: "EADDRINUSE" }),
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fakeApp: any = { use: jest.fn() };

    const started = await initializeStudio(fakeApp, { enabled: true });

    expect(started).toBe(false);
    expect(isStudioEnabled()).toBe(false);
  });
});
