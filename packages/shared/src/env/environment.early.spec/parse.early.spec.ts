/* eslint-disable @typescript-eslint/no-explicit-any */
// Unit tests for: parse

import { parse } from "../environment";

// Mocking the logger
jest.mock("../../utils/logger", () => {
  const actual = jest.requireActual("../../utils/logger");
  return {
    ...actual,
    log: jest.fn(),
  };
});

// Mocking the Buffer interface
interface MockBuffer {
  toString: jest.Mock;
}

describe("parse() parse method", () => {
  let mockBuffer: MockBuffer;

  beforeEach(() => {
    mockBuffer = {
      toString: jest.fn(),
    };
  });

  it("should parse a simple key-value pair", () => {
    mockBuffer.toString.mockReturnValue("KEY=VALUE\n" as any);

    const result = parse(mockBuffer as any);

    expect(result).toEqual({ KEY: "VALUE" });
  });

  it("should handle quoted values correctly", () => {
    mockBuffer.toString.mockReturnValue('KEY="VALUE"\n' as any);

    const result = parse(mockBuffer as any);

    expect(result).toEqual({ KEY: "VALUE" });
  });

  it("should handle multiline values with escaped newlines", () => {
    mockBuffer.toString.mockReturnValue('KEY="Line1\\nLine2"\n' as any);

    const result = parse(mockBuffer as any);

    expect(result).toEqual({ KEY: "Line1\nLine2" });
  });

  it("should handle empty values", () => {
    mockBuffer.toString.mockReturnValue("KEY=\n" as any);

    const result = parse(mockBuffer as any);

    expect(result).toEqual({ KEY: "" });
  });

  it("should ignore lines that do not match the regex", () => {
    mockBuffer.toString.mockReturnValue("INVALID_LINE\nKEY=VALUE\n" as any);

    const result = parse(mockBuffer as any);

    expect(result).toEqual({ KEY: "VALUE" });
  });

  it("should handle values with spaces around the equal sign", () => {
    mockBuffer.toString.mockReturnValue("KEY = VALUE\n" as any);

    const result = parse(mockBuffer as any);

    expect(result).toEqual({ KEY: "VALUE" });
  });

  it("should handle values with leading and trailing spaces", () => {
    mockBuffer.toString.mockReturnValue("KEY=  VALUE  \n" as any);

    const result = parse(mockBuffer as any);

    expect(result).toEqual({ KEY: "VALUE" });
  });

  it("should handle single-quoted values", () => {
    mockBuffer.toString.mockReturnValue("KEY='VALUE'\n" as any);

    const result = parse(mockBuffer as any);

    expect(result).toEqual({ KEY: "VALUE" });
  });

  it("should handle backtick-quoted values", () => {
    mockBuffer.toString.mockReturnValue("KEY=`VALUE`\n" as any);

    const result = parse(mockBuffer as any);

    expect(result).toEqual({ KEY: "VALUE" });
  });

  it("should handle escaped characters within double quotes", () => {
    mockBuffer.toString.mockReturnValue('KEY="Line1\\nLine2\\r"\n' as any);

    const result = parse(mockBuffer as any);

    expect(result).toEqual({ KEY: "Line1\nLine2\r" });
  });

  it("should return an empty object for an empty input", () => {
    mockBuffer.toString.mockReturnValue("" as any);

    const result = parse(mockBuffer as any);

    expect(result).toEqual({});
  });
});

// End of unit tests for: parse
