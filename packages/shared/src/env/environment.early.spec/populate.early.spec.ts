/* eslint-disable @typescript-eslint/no-explicit-any */
// Unit tests for: populate

import { log, LogLevel } from "../../utils/logger";
import { populate } from "../environment";

// Mocking the logger
jest.mock("../../utils/logger", () => {
  const actual = jest.requireActual("../../utils/logger");
  return {
    ...actual,
    log: jest.fn(),
  };
});

// Mock interface for IConfigOptions
class MockIConfigOptions {
  public debug: boolean = false;
  public override: boolean = false;
  public envObject?: any = undefined;
}

describe("populate() populate method", () => {
  let mockEnvObject: { [key: string]: string };
  let mockParsed: { [key: string]: string };
  let mockOptions: MockIConfigOptions;

  beforeEach(() => {
    mockEnvObject = {};
    mockParsed = {};
    mockOptions = new MockIConfigOptions();
  });

  test("should populate envObject with parsed values when no options are provided", () => {
    mockParsed = { KEY1: "value1", KEY2: "value2" };

    populate(mockEnvObject, mockParsed, mockOptions as any);

    expect(mockEnvObject).toEqual(mockParsed);
  });

  test("should throw an error if parsed is not an object", () => {
    expect(() => {
      populate(mockEnvObject, null as any, mockOptions as any);
    }).toThrow(new Error("Cannot convert undefined or null to object"));
  });

  test("should overwrite existing keys in envObject if override is true", () => {
    mockEnvObject = { KEY1: "oldValue" };
    mockParsed = { KEY1: "newValue" };
    mockOptions.override = true;

    populate(mockEnvObject, mockParsed, mockOptions as any);

    expect(mockEnvObject.KEY1).toBe("newValue");
  });

  test("should not overwrite existing keys in envObject if override is false", () => {
    mockEnvObject = { KEY1: "oldValue" };
    mockParsed = { KEY1: "newValue" };
    mockOptions.override = false;

    populate(mockEnvObject, mockParsed, mockOptions as any);

    expect(mockEnvObject.KEY1).toBe("oldValue");
  });

  test("should log debug messages if debug is true", () => {
    mockParsed = { KEY1: "value1" };
    mockOptions.debug = true;

    populate(mockEnvObject, mockParsed, mockOptions as any);

    expect(log).toHaveBeenCalledWith('"KEY1" was set to "value1"', LogLevel.Debug);
  });

  test("should handle empty parsed object gracefully", () => {
    mockParsed = {};

    populate(mockEnvObject, mockParsed, mockOptions as any);

    expect(mockEnvObject).toEqual({});
  });

  test("should handle empty envObject gracefully", () => {
    mockParsed = { KEY1: "value1" };

    populate(mockEnvObject, mockParsed, mockOptions as any);

    expect(mockEnvObject).toEqual(mockParsed);
  });
});

// End of unit tests for: populate
