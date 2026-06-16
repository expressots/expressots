// Regression test: importing @expressots/adapter-express must NOT mutate
// stdio or the global console. Buffering is opt-in and only activates when
// AppExpress is constructed (or bootstrap() explicitly enables it).
//
// This protects test harnesses, type-only consumers, and dev tooling from
// silently losing console output just because they imported the module.

describe("@expressots/adapter-express — import has no stdio side effects", () => {
  // Capture references *without* `.bind()` — `.bind` returns a fresh
  // function every call, so a `.bind()`-based capture would never match
  // the live property afterwards even if it were genuinely untouched.
  const originalStdoutWrite = process.stdout.write;
  const originalStderrWrite = process.stderr.write;
  const originalConsoleLog = console.log;
  const originalConsoleInfo = console.info;
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;
  const originalConsoleDebug = console.debug;

  it("does not replace process.stdout.write at import time", async () => {
    // Force a fresh module load so the assertion reflects import-time
    // behavior, not state from earlier tests in the same Jest worker.
    jest.resetModules();
    await import("../application-express");

    expect(process.stdout.write).toBe(originalStdoutWrite);
    expect(process.stderr.write).toBe(originalStderrWrite);
  });

  it("does not replace console methods at import time", async () => {
    jest.resetModules();
    await import("../application-express");

    expect(console.log).toBe(originalConsoleLog);
    expect(console.info).toBe(originalConsoleInfo);
    expect(console.warn).toBe(originalConsoleWarn);
    expect(console.error).toBe(originalConsoleError);
    expect(console.debug).toBe(originalConsoleDebug);
  });

  it("exposes startLogBuffering as an opt-in static API", async () => {
    jest.resetModules();
    const { AppExpress } = await import("../application-express");

    expect(typeof AppExpress.startLogBuffering).toBe("function");
    expect(typeof AppExpress.disableBuffering).toBe("function");
  });
});
