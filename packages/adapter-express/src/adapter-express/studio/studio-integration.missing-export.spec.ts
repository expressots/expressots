jest.mock("@expressots/studio-agent", () => ({}));

describe("studio-integration missing StudioAgent export", () => {
  it("returns false when StudioAgent is missing from the module export", async () => {
    jest.resetModules();
    const mod = await import("./studio-integration");
    process.env.NODE_ENV = "development";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fakeApp: any = { use: jest.fn() };

    await expect(mod.initializeStudio(fakeApp, { enabled: true })).resolves.toBe(false);
  });
});
