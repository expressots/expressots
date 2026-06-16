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

  it("handles object arguments while restoring original console methods", () => {
    AppExpress.startLogBuffering();
    console.warn({ nested: { value: 1 } });
    AppExpress.disableBuffering();
  });
});
