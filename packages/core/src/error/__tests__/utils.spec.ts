import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { beautifyStackTrace } from "../utils";

describe("beautifyStackTrace", () => {
  let consoleLogSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it("should not log anything if stack trace is empty", () => {
    const stack = "";

    beautifyStackTrace(stack);

    expect(consoleLogSpy).not.toHaveBeenCalled();
  });
});
