// Unit tests for: printSuccess

import { stdout } from "process";
import { printSuccess } from "../logger";

jest.mock("chalk", () => ({
  green: jest.fn((text) => text),
  bold: jest.fn((text) => text),
  white: jest.fn((text) => text),
}));

describe("printSuccess() printSuccess method", () => {
  let stdoutWriteSpy: jest.SpyInstance;

  beforeEach(() => {
    // Spy on stdout.write to capture its output
    stdoutWriteSpy = jest.spyOn(stdout, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    // Restore the original implementation of stdout.write
    stdoutWriteSpy.mockRestore();
  });

  it("should print a success message with the correct format", () => {
    // Test description: Verifies that the function outputs the message in the expected format.
    const message = "Operation completed";
    const component = "ComponentA";

    printSuccess(message, component);

    expect(stdoutWriteSpy).toHaveBeenCalledWith(`${message}: [${component}] ✔️\n`);
  });

  it("should handle an empty message", () => {
    // Test description: Ensures the function can handle an empty message string.
    const message = "";
    const component = "ComponentB";

    printSuccess(message, component);

    expect(stdoutWriteSpy).toHaveBeenCalledWith(`: [${component}] ✔️\n`);
  });

  it("should handle an empty component", () => {
    // Test description: Ensures the function can handle an empty component string.
    const message = "Operation completed";
    const component = "";

    printSuccess(message, component);

    expect(stdoutWriteSpy).toHaveBeenCalledWith(`${message}: [] ✔️\n`);
  });

  it("should handle both message and component being empty", () => {
    // Test description: Ensures the function can handle both message and component being empty.
    const message = "";
    const component = "";

    printSuccess(message, component);

    expect(stdoutWriteSpy).toHaveBeenCalledWith(`: [] ✔️\n`);
  });
});

// End of unit tests for: printSuccess
