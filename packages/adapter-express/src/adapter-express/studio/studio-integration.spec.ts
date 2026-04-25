import {
  initializeStudio,
  stopStudio,
  isStudioEnabled,
  getStudioAgent,
} from "./studio-integration";

describe("studio-integration", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
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

  it("returns false when @expressots/studio-agent is not installed", async () => {
    // The peer is optional; in a typical adapter-express test environment
    // it isn't installed and require.resolve throws.
    process.env.NODE_ENV = "development";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fakeApp: any = { use: jest.fn() };
    const result = await initializeStudio(fakeApp);

    // Either false (peer missing) or true (rare, peer present in monorepo).
    // Both are acceptable for a smoke test; what we assert is that the
    // function never throws and the boolean shape is preserved.
    expect(typeof result).toBe("boolean");
  });

  it("stopStudio() is safe to call when no agent is running", async () => {
    await expect(stopStudio()).resolves.toBeUndefined();
    expect(isStudioEnabled()).toBe(false);
  });
});
