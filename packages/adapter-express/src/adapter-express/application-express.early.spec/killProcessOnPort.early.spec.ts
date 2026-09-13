import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { AppExpress } from "../application-express";

jest.mock("node:child_process", () => ({
  ...jest.requireActual("node:child_process"),
  execFile: jest.fn(),
}));

const execFileMock = execFile as unknown as jest.Mock & Record<symbol, unknown>;

// `promisify(execFile)` uses execFile's custom promisify hook, which resolves
// with `{ stdout, stderr }`. A bare jest.fn has no hook, so give the mock one
// and assert on it.
const execFileAsync = jest.fn<
  Promise<{ stdout: string; stderr: string }>,
  [string, Array<string>]
>();
execFileMock[promisify.custom] = execFileAsync;

function answer(stdoutByCommand: Record<string, string>): void {
  execFileAsync.mockImplementation(async (file: string) => {
    if (file in stdoutByCommand) {
      return { stdout: stdoutByCommand[file], stderr: "" };
    }
    throw new Error(`${file}: not found`);
  });
}

function killProcessOnPort(port: number): Promise<boolean> {
  const app = new AppExpress();
  return (
    app as unknown as { killProcessOnPort: (port: number) => Promise<boolean> }
  ).killProcessOnPort(port);
}

describe("AppExpress.killProcessOnPort()", () => {
  const platform = process.platform;
  let killSpy: jest.SpyInstance;

  beforeEach(() => {
    execFileAsync.mockReset();
    killSpy = jest.spyOn(process, "kill").mockImplementation(() => true);
  });

  afterEach(() => {
    killSpy.mockRestore();
    Object.defineProperty(process, "platform", { value: platform });
  });

  it("never runs a command for a port that is not a valid integer", async () => {
    for (const port of [0, -1, 70000, 3000.5, Number.NaN]) {
      await expect(killProcessOnPort(port)).resolves.toBe(false);
    }
    expect(execFileAsync).not.toHaveBeenCalled();
  });

  it("looks the port up with lsof as an argument list and kills with process.kill", async () => {
    Object.defineProperty(process, "platform", { value: "linux" });
    answer({ lsof: `${process.pid}\n4242\n` });

    await expect(killProcessOnPort(3000)).resolves.toBe(true);

    expect(execFileAsync).toHaveBeenCalledTimes(1);
    expect(execFileAsync).toHaveBeenCalledWith("lsof", ["-ti", ":3000"]);
    // Own pid is skipped; the foreign one is killed without a shell.
    expect(killSpy).toHaveBeenCalledTimes(1);
    expect(killSpy).toHaveBeenCalledWith(4242, "SIGKILL");
  });

  it("matches only the local address column on Windows and kills via taskkill argv", async () => {
    Object.defineProperty(process, "platform", { value: "win32" });
    answer({
      netstat: [
        "  TCP    0.0.0.0:30001          0.0.0.0:0              LISTENING       111",
        "  TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING       2222",
        "  TCP    127.0.0.1:5000         127.0.0.1:3000         ESTABLISHED     333",
      ].join("\r\n"),
      taskkill: "",
    });

    await expect(killProcessOnPort(3000)).resolves.toBe(true);

    const taskkill = execFileAsync.mock.calls.find((call) => call[0] === "taskkill");
    expect(taskkill?.[1]).toEqual(["/F", "/PID", "2222"]);
    expect(killSpy).not.toHaveBeenCalled();
  });

  it("returns false when nothing listens or the lookup tool is missing", async () => {
    Object.defineProperty(process, "platform", { value: "linux" });
    answer({ lsof: "\n" });
    await expect(killProcessOnPort(3000)).resolves.toBe(false);

    answer({});
    await expect(killProcessOnPort(3000)).resolves.toBe(false);
    expect(killSpy).not.toHaveBeenCalled();
  });
});
