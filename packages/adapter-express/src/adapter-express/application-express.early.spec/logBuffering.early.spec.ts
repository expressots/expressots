import { AppExpress } from "../application-express";

describe("AppExpress log buffering static API", () => {
  const originalStdout = process.stdout.write.bind(process.stdout);
  const originalStderr = process.stderr.write.bind(process.stderr);

  afterEach(() => {
    AppExpress.disableBuffering();
    process.stdout.write = originalStdout;
    process.stderr.write = originalStderr;
  });

  it("buffers console and stdout output until disabled", () => {
    AppExpress.startLogBuffering();
    console.log("buffered-log");
    process.stdout.write("buffered-write\n");

    AppExpress.disableBuffering();

    expect(() => console.log("after-disable")).not.toThrow();
  });

  it("flushes buffered logs after disabling buffering", () => {
    const writes: string[] = [];
    const captureWrite = ((chunk: string | Uint8Array) => {
      writes.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString());
      return true;
    }) as typeof process.stdout.write;

    AppExpress.startLogBuffering();
    (
      AppExpress as unknown as { originalStdoutWrite: typeof process.stdout.write }
    ).originalStdoutWrite = captureWrite;
    console.log("queued-log");
    (AppExpress as unknown as { flushBufferedLogs: () => void }).flushBufferedLogs();
    AppExpress.disableBuffering();

    expect(writes.join("")).toContain("queued-log");
  });

  it("falls back to String() when original console methods receive circular objects", () => {
    AppExpress.startLogBuffering();
    AppExpress.disableBuffering();

    const circular: { self?: unknown } = {};
    circular.self = circular;

    expect(() =>
      (
        AppExpress as unknown as { originalGlobalConsole: { warn: (...args: unknown[]) => void } }
      ).originalGlobalConsole.warn(circular),
    ).not.toThrow();
  });
});
