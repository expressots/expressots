import { Logger } from "@expressots/core";
import { getControllersFromContainer } from "../utils";
import { NO_CONTROLLERS_FOUND, TYPE } from "../constants";

jest.mock("@expressots/core", () => {
  const actual = jest.requireActual("@expressots/core");
  return {
    ...actual,
    Logger: jest.fn().mockImplementation(() => ({
      error: jest.fn(),
    })),
  };
});

describe("getControllersFromContainer()", () => {
  it("returns an empty array when no controllers are bound and force is false", () => {
    const container = {
      isBound: jest.fn().mockReturnValue(false),
      getAll: jest.fn(),
    };

    expect(getControllersFromContainer(container as never, false)).toEqual([]);
  });

  it("throws when controllers are required but missing", () => {
    const container = {
      isBound: jest.fn().mockReturnValue(false),
      getAll: jest.fn(),
    };

    expect(() => getControllersFromContainer(container as never, true)).toThrow(
      NO_CONTROLLERS_FOUND,
    );
    expect(Logger).toHaveBeenCalled();
    expect(container.isBound).toHaveBeenCalledWith(TYPE.Controller);
  });

  it("returns all controllers when they are bound", () => {
    const controllers = [{ name: "UsersController" }];
    const container = {
      isBound: jest.fn().mockReturnValue(true),
      getAll: jest.fn().mockReturnValue(controllers),
    };

    expect(getControllersFromContainer(container as never, false)).toBe(controllers);
  });
});
