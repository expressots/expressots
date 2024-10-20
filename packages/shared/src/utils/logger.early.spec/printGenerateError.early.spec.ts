// Unit tests for: printGenerateError

import chalk from "chalk";
import { stdout } from "process";
import { printGenerateError } from "../logger";

jest.mock("process", () => ({
  stdout: {
    write: jest.fn(),
  },
}));

jest.mock("chalk", () => ({
  redBright: jest.fn((text) => text),
  bold: {
    white: jest.fn((text) => text),
  },
}));

describe("printGenerateError() printGenerateError method", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should format and write the error message to stdout for a given schematic and file", async () => {
    // Arrange
    const schematic = "TestSchematic";
    const file = "testFile.ts";

    // Act
    await printGenerateError(schematic, file);

    // Assert
    const expectedSchematicFormatted = "[TestSchematic]".padEnd(14);
    const expectedFileNameFormatted = "testFile not created! ❌\n";
    const expectedOutput = expectedSchematicFormatted + expectedFileNameFormatted;

    expect(chalk.redBright).toHaveBeenCalledWith(expectedSchematicFormatted);
    expect(chalk.bold.white).toHaveBeenCalledWith(expectedFileNameFormatted);
    expect(stdout.write).toHaveBeenCalledWith(expectedOutput);
  });

  it("should handle an empty schematic and file name", async () => {
    // Arrange
    const schematic = "";
    const file = "";

    // Act
    await printGenerateError(schematic, file);

    // Assert
    const expectedSchematicFormatted = "[]".padEnd(14);
    const expectedFileNameFormatted = " not created! ❌\n";
    const expectedOutput = expectedSchematicFormatted + expectedFileNameFormatted;

    expect(chalk.redBright).toHaveBeenCalledWith(expectedSchematicFormatted);
    expect(chalk.bold.white).toHaveBeenCalledWith(expectedFileNameFormatted);
    expect(stdout.write).toHaveBeenCalledWith(expectedOutput);
  });

  it("should handle a file name without an extension", async () => {
    // Arrange
    const schematic = "AnotherSchematic";
    const file = "fileWithoutExtension";

    // Act
    await printGenerateError(schematic, file);

    // Assert
    const expectedSchematicFormatted = "[AnotherSchematic]".padEnd(14);
    const expectedFileNameFormatted = "fileWithoutExtension not created! ❌\n";
    const expectedOutput = expectedSchematicFormatted + expectedFileNameFormatted;

    expect(chalk.redBright).toHaveBeenCalledWith(expectedSchematicFormatted);
    expect(chalk.bold.white).toHaveBeenCalledWith(expectedFileNameFormatted);
    expect(stdout.write).toHaveBeenCalledWith(expectedOutput);
  });
});

// End of unit tests for: printGenerateError
