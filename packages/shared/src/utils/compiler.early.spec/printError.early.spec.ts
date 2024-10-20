// Unit tests for: printError

import chalk from "chalk";
import { printError } from "../compiler";

describe("printError() printError method", () => {
  // Mock console.error to capture its output
  let consoleErrorSpy: jest.SpyInstance;

  beforeAll(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  afterEach(() => {
    consoleErrorSpy.mockClear();
  });

  it("should print a formatted error message with the given message and component", () => {
    // Arrange
    const message = "Test error message";
    const component = "TestComponent";

    // Act
    printError(message, component);

    // Assert
    const expectedOutput = chalk.red(`${message}:`, chalk.bold(chalk.white(`[${component}] ❌`)));
    expect(consoleErrorSpy).toHaveBeenCalledWith(expectedOutput);
  });

  it("should handle empty message and component gracefully", () => {
    // Arrange
    const message = "";
    const component = "";

    // Act
    printError(message, component);

    // Assert
    const expectedOutput = chalk.red(`${message}:`, chalk.bold(chalk.white(`[${component}] ❌`)));
    expect(consoleErrorSpy).toHaveBeenCalledWith(expectedOutput);
  });

  it("should handle special characters in message and component", () => {
    // Arrange
    const message = "Error! @#$%^&*()";
    const component = "Component! @#$%^&*()";

    // Act
    printError(message, component);

    // Assert
    const expectedOutput = chalk.red(`${message}:`, chalk.bold(chalk.white(`[${component}] ❌`)));
    expect(consoleErrorSpy).toHaveBeenCalledWith(expectedOutput);
  });

  it("should handle long messages and component names", () => {
    // Arrange
    const message = "A".repeat(1000);
    const component = "B".repeat(1000);

    // Act
    printError(message, component);

    // Assert
    const expectedOutput = chalk.red(`${message}:`, chalk.bold(chalk.white(`[${component}] ❌`)));
    expect(consoleErrorSpy).toHaveBeenCalledWith(expectedOutput);
  });
});

// End of unit tests for: printError
