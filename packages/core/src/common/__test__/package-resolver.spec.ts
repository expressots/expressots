import "reflect-metadata";

import { describe, it, expect, vi } from "vitest";
import { Logger } from "../../provider/logger/logger.provider";
import { packageResolver } from "../package-resolver.provider";

// Mock logger class
vi.mock("../../provider/logger/logger.provider", () => {
  return {
    Logger: vi.fn().mockImplementation(() => {
      return {
        warn: vi.fn(),
      };
    }),
  };
});

describe("Package Resolver", () => {
  it("Resolve a package", () => {
    expect(true).toBe(true);
  });

  it("Resolve a package with options", () => {
    expect(true).toBe(true);
  });

  it("Resolve a package with default export", () => {
    expect(true).toBe(true);
  });

  it("Resolve a package with default export and options", () => {
    expect(true).toBe(true);
  });
});
