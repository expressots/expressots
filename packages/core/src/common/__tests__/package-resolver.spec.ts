import "reflect-metadata";

import { afterEach, describe, expect, it, vi } from "vitest";
import { packageResolver } from "../package-resolver";

afterEach(() => {
  vi.clearAllMocks();
});

describe("Package Resolver", () => {
  it("resolves and require package", () => {
    const pkgRes = packageResolver("inversify");
    expect(pkgRes).toBeDefined();
  });

  it("warns if package is not installed", () => {
    const pkgRes = packageResolver("inversify-not-installed");
    expect(pkgRes).toBeUndefined();
  });
});
