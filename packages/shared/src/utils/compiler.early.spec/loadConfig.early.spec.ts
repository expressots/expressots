/* eslint-disable @typescript-eslint/no-explicit-any */
// Unit tests for: loadConfig

import { Compiler } from "../compiler";

jest.mock("node:fs", () => ({
  existsSync: jest.fn().mockReturnValue(false),
}));

jest.mock("ts-node", () => ({
  register: jest.fn(() => ({
    enabled: jest.fn(),
  })),
}));

describe("Compiler.loadConfig() loadConfig method", () => {
  let mockExit: jest.SpyInstance;

  beforeAll(() => {
    mockExit = jest.spyOn(process, "exit").mockImplementation((code?: string | number): never => {
      throw new Error(`process.exit() was called with code ${code}`);
    });
  });

  afterAll(() => {
    mockExit.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should exit the process with an error if the config file is not found", async () => {
    await expect(Compiler.loadConfig()).rejects.toThrow("process.exit() was called with code 1");
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});

// End of unit tests for: loadConfig
