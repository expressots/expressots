import "reflect-metadata";

import { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { StatusCode } from "../../../error/status-code";
import { ValidateDTO } from "../dto-validator.provider";

vi.mock("../../../common/package-resolver", () => {
  return {
    packageResolver: vi.fn().mockImplementation((packageName) => {
      if (packageName === "class-validator") {
        return {
          validate: vi.fn().mockImplementation(async (dto) => {
            if (dto.invalid) {
              return [
                {
                  property: "invalid",
                  constraints: { isNotEmpty: "field should not be empty" },
                },
              ];
            }
            return [];
          }),
        };
      } else if (packageName === "class-transformer") {
        return {
          plainToClass: vi.fn().mockImplementation((type, obj) => obj),
        };
      }
      return null;
    }),
  };
});

vi.mock("../../logger/logger.provider", () => ({
  Logger: vi.fn().mockImplementation(() => ({
    error: vi.fn(),
  })),
}));

describe("Validate DTO", () => {
  it("pass validation for a valid DTO", async () => {
    const req = { body: { valid: true } } as Request;
    const res = {} as Response;
    const next = vi.fn();
    const mockDTO = class {};

    const validateMiddleware = ValidateDTO(mockDTO);
    await validateMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("return error response for an invalid DTO", async () => {
    const req = { body: { invalid: true } } as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    const next = vi.fn();
    const mockDTO = class {};

    const validateMiddleware = ValidateDTO(mockDTO);
    await validateMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(StatusCode.BadRequest);
    expect(res.json).toHaveBeenCalledWith(expect.any(Object));
    expect(next).not.toHaveBeenCalled();
  });
});
