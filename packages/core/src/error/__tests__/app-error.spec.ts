import { describe, it, expect } from "vitest";
import { AppError } from "../app-error"; // Adjust the import path accordingly

describe("AppError", () => {
  it("correctly assign message, statusCode, and service properties", () => {
    const defaultError = new AppError("Default error");
    expect(defaultError.message).toBe("Default error");
    expect(defaultError.statusCode).toBe(500);
    expect(defaultError.service).toBeUndefined();

    const customError = new AppError("Custom error", 404, "UserService");
    expect(customError.message).toBe("Custom error");
    expect(customError.statusCode).toBe(404);
    expect(customError.service).toBe("UserService");
  });

  it("create an instance of Error", () => {
    const error = new AppError("Test error");
    expect(error).toBeInstanceOf(Error);
    expect(error.stack).toBeDefined();
  });

  it("throwing an error with correct properties", () => {
    try {
      throw new AppError("Throwing an error", 400, "AuthService");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe("Throwing an error");
      expect(error.statusCode).toBe(400);
      expect(error.service).toBe("AuthService");
    }
  });
});
