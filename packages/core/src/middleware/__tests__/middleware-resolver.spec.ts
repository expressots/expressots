import { beforeEach, describe, expect, it, vi } from "vitest";
import { middlewareResolver } from "../middleware-resolver"; // Adjust the import path

beforeEach(() => {
  vi.clearAllMocks();
});

describe("middlewareResolver", () => {
  it("returns null for unregistered middleware", () => {
    const result = middlewareResolver("unregisteredMiddleware");
    expect(result).toBeNull();
  });
});
