import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../app-error";
import { Report } from "../report";

vi.mock("../../provider/logger/logger.provider", () => ({
  Logger: vi.fn().mockImplementation(() => ({
    error: vi.fn(),
  })),
}));

describe("Report", () => {
  let report: Report;
  let loggerSpy: any;

  beforeEach(() => {
    report = new Report();
    loggerSpy = vi.spyOn(report["logger"], "error");
  });

  it("creates and logs an AppError correctly when passed an Error object", () => {
    const testError = new Error("Test error");
    const statusCode = 400;
    const service = "TestService";

    const thrownError = report.error(testError, statusCode, service);

    expect(thrownError).toBeInstanceOf(AppError);
    expect(thrownError.message).toBe(testError.message);
    expect(thrownError.statusCode).toBe(statusCode);
    expect(thrownError.service).toBe(service);
    expect(loggerSpy).toHaveBeenCalledWith(testError.message, service);
  });

  it("creates and logs an AppError correctly when passed a string error", () => {
    const errorMessage = "String error";
    const statusCode = 500;

    const thrownError = report.error(errorMessage);

    expect(thrownError).toBeInstanceOf(AppError);
    expect(thrownError.message).toBe(errorMessage);
    expect(thrownError.statusCode).toBe(statusCode);
    expect(thrownError.service).toBeUndefined();

    expect(loggerSpy).toHaveBeenCalledWith(errorMessage, "service-undefined");
  });
});
