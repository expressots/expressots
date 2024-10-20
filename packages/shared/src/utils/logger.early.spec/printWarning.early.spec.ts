// Unit tests for: printWarning

import chalk from "chalk";
import { stdout } from "process";
import { printWarning } from "../logger";

describe("printWarning() printWarning method", () => {
  let stdoutWriteSpy: jest.SpyInstance;

  beforeEach(() => {
    // Mock stdout.write to capture its output
    stdoutWriteSpy = jest.spyOn(stdout, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    // Restore the original implementation of stdout.write
    stdoutWriteSpy.mockRestore();
  });

  it("should print a warning message without a component", () => {
    // Test to ensure the function prints the correct message when no component is provided
    const message = "This is a warning";
    printWarning(message);

    expect(stdoutWriteSpy).toHaveBeenCalledWith(chalk.yellow(`${message} ⚠️\n`));
  });

  it("should print a warning message with a component", () => {
    // Test to ensure the function prints the correct message when a component is provided
    const message = "This is a warning";
    const component = "ComponentName";
    printWarning(message, component);

    expect(stdoutWriteSpy).toHaveBeenCalledWith(
      chalk.yellow(`${message}:`, chalk.bold(chalk.white(`[${component}] ⚠️\n`))),
    );
  });

  it("should handle an empty message without a component", () => {
    // Test to ensure the function handles an empty message correctly when no component is provided
    const message = "";
    printWarning(message);

    expect(stdoutWriteSpy).toHaveBeenCalledWith(chalk.yellow(`${message} ⚠️\n`));
  });

  it("should handle an empty message with a component", () => {
    // Test to ensure the function handles an empty message correctly when a component is provided
    const message = "";
    const component = "ComponentName";
    printWarning(message, component);

    expect(stdoutWriteSpy).toHaveBeenCalledWith(
      chalk.yellow(`${message}:`, chalk.bold(chalk.white(`[${component}] ⚠️\n`))),
    );
  });

  it("should handle an empty component", () => {
    // Test to ensure the function handles an empty component correctly
    const message = "This is a warning";
    const component = "";
    printWarning(message, component);

    expect(stdoutWriteSpy).toHaveBeenCalledWith(
      chalk.yellow(`${message}:`, chalk.bold(chalk.white(`[${component}] ⚠️\n`))),
    );
  });
});

// End of unit tests for: printWarning
