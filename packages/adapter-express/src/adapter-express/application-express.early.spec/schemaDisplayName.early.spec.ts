import express from "express";
import { AppExpress } from "../application-express";

describe("AppExpress.schemaDisplayName() method", () => {
  let appExpress: AppExpress;

  beforeEach(() => {
    appExpress = new AppExpress() as AppExpress;
    (appExpress as unknown as { app: express.Application }).app = {
      use: jest.fn(),
    } as unknown as express.Application;
  });

  const displayName = (schema: unknown): string | undefined =>
    (
      appExpress as unknown as {
        schemaDisplayName: (s: unknown) => string | undefined;
      }
    ).schemaDisplayName(schema);

  it("returns the constructor name for class-based schemas", () => {
    class CreateUserDTO {}
    expect(displayName(CreateUserDTO)).toBe("CreateUserDTO");
  });

  it("returns undefined for non-function schemas", () => {
    expect(displayName({ type: "object" })).toBeUndefined();
    expect(displayName(null)).toBeUndefined();
  });
});
