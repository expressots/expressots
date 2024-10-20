// Unit tests for: printError

import chalk from "chalk";
import { stdout } from "process";
import { printError } from "../logger";

jest.mock("process", () => ({
  stdout: {
    write: jest.fn(),
  },
}));

describe("printError() printError method", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should print error with message and component", () => {
    // Test to ensure the function correctly formats and outputs an error message with both message and component
    const message = "An error occurred";
    const component = "ComponentA";
    const expectedOutput = chalk.red(
      `${message}: ${chalk.bold(chalk.white(`[${component}] ❌\n`))}`,
    );

    printError(message, component);

    expect(stdout.write).toHaveBeenCalledWith(expectedOutput);
  });

  it("should print error with message and no component", () => {
    // Test to ensure the function correctly formats and outputs an error message with a message but no component
    const message = "An error occurred";
    const component = "";
    const expectedOutput = chalk.red(`${message}: ${chalk.bold(chalk.white(`[] ❌\n`))}`);

    printError(message, component);

    expect(stdout.write).toHaveBeenCalledWith(expectedOutput);
  });

  it("should print error with no message and component", () => {
    // Test to ensure the function correctly formats and outputs an error message with no message but with a component
    const message = "";
    const component = "ComponentA";
    const expectedOutput = chalk.red(`: ${chalk.bold(chalk.white(`[${component}] ❌\n`))}`);

    printError(message, component);

    expect(stdout.write).toHaveBeenCalledWith(expectedOutput);
  });

  it("should print error with no message and no component", () => {
    // Test to ensure the function correctly formats and outputs an error message with neither message nor component
    const message = "";
    const component = "";
    const expectedOutput = chalk.red(`: ${chalk.bold(chalk.white(`[] ❌\n`))}`);

    printError(message, component);

    expect(stdout.write).toHaveBeenCalledWith(expectedOutput);
  });
});

// End of unit tests for: printError
