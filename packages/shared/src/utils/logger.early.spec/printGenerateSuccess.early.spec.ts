// Unit tests for: printGenerateSuccess

import { stdout } from "process";
import { printGenerateSuccess } from "../logger";

jest.mock("chalk", () => ({
  greenBright: jest.fn((text) => text),
  bold: {
    white: jest.fn((text) => text),
  },
}));

describe("printGenerateSuccess() printGenerateSuccess method", () => {
  let stdoutWriteSpy: jest.SpyInstance;

  beforeEach(() => {
    // Mock stdout.write to capture its output
    stdoutWriteSpy = jest.spyOn(stdout, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    // Restore the original implementation of stdout.write
    stdoutWriteSpy.mockRestore();
  });

  it("should format and print the success message correctly for a given schematic and file", async () => {
    // Test description: Verify that the function formats and prints the success message correctly
    const schematic = "Component";
    const file = "MyComponent.ts";

    await printGenerateSuccess(schematic, file);

    const expectedOutput = "[Component]   MyComponent created! ✔️\n";
    expect(stdoutWriteSpy).toHaveBeenCalledWith(expectedOutput);
  });

  it("should handle schematic names of varying lengths", async () => {
    // Test description: Ensure the function correctly formats schematic names of different lengths
    const schematic = "Short";
    const file = "MyComponent.ts";

    await printGenerateSuccess(schematic, file);

    const expectedOutput = "[Short]       MyComponent created! ✔️\n";
    expect(stdoutWriteSpy).toHaveBeenCalledWith(expectedOutput);
  });

  it("should handle file names without extensions", async () => {
    // Test description: Verify the function handles file names without extensions correctly
    const schematic = "Service";
    const file = "MyService";

    await printGenerateSuccess(schematic, file);

    const expectedOutput = "[Service]     MyService created! ✔️\n";
    expect(stdoutWriteSpy).toHaveBeenCalledWith(expectedOutput);
  });

  it("should handle empty schematic and file names", async () => {
    // Test description: Test the function's behavior with empty schematic and file names
    const schematic = "";
    const file = "";

    await printGenerateSuccess(schematic, file);

    const expectedOutput = "[]             created! ✔️\n";
    expect(stdoutWriteSpy).toHaveBeenCalledWith(expectedOutput);
  });

  it("should handle file names with multiple dots", async () => {
    // Test description: Ensure the function correctly handles file names with multiple dots
    const schematic = "Module";
    const file = "My.Module.ts";

    await printGenerateSuccess(schematic, file);

    const expectedOutput = "[Module]      My created! ✔️\n";
    expect(stdoutWriteSpy).toHaveBeenCalledWith(expectedOutput);
  });
});

// End of unit tests for: printGenerateSuccess
