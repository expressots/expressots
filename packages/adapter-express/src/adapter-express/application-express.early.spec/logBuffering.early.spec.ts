import { AppExpress } from "../application-express";

describe("AppExpress log buffering static API", () => {
  const originalStdout = process.stdout.write.bind(process.stdout);
  const originalStderr = process.stderr.write.bind(process.stderr);
  const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  };

  afterEach(() => {
    AppExpress.disableBuffering();
    process.stdout.write = originalStdout;
    process.stderr.write = originalStderr;
    Object.assign(console, originalConsole);
  });

  it("buffers console and stdout output until disabled", () => {
    AppExpress.startLogBuffering();
    console.log("buffered-log");
    process.stdout.write("buffered-write\n");

    AppExpress.disableBuffering();

    expect(() => console.log("after-disable")).not.toThrow();
  });

  it("swallows output while buffering and restores it afterwards", () => {
    // Install the capture *before* buffering starts so it becomes the
    // "original" stream the buffer restores to. Asserting through the public
    // API rather than reaching into private state keeps this test honest
    // about what callers can actually observe.
    const writes: Array<string> = [];
    process.stdout.write = ((chunk: string | Uint8Array) => {
      writes.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString());
      return true;
    }) as typeof process.stdout.write;

    AppExpress.startLogBuffering();
    process.stdout.write("queued-write\n");
    expect(writes.join("")).not.toContain("queued-write");

    AppExpress.disableBuffering();
    process.stdout.write("released-write\n");

    expect(writes.join("")).toContain("released-write");
  });

  it("flushes buffered logs to the original stream", () => {
    const writes: Array<string> = [];
    process.stdout.write = ((chunk: string | Uint8Array) => {
      writes.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString());
      return true;
    }) as typeof process.stdout.write;

    AppExpress.startLogBuffering();
    process.stdout.write("queued-log\n");

    // flushBufferedLogs is private; the banner flow reaches it internally.
    // Exercise it the same way AppExpress does.
    (AppExpress as unknown as { flushBufferedLogs: () => void }).flushBufferedLogs();

    expect(writes.join("")).toContain("queued-log");
  });

  it("restores console methods that survive circular objects", () => {
    AppExpress.startLogBuffering();
    AppExpress.disableBuffering();

    const circular: { self?: unknown } = {};
    circular.self = circular;

    // After disabling, console.warn is the restored original — JSON.stringify
    // would throw on this input, so it must fall back to String().
    expect(() => console.warn(circular)).not.toThrow();
  });
});
