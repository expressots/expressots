import type { Request, Response } from "express";
import { ValidationService } from "./validation-service";
import { validatedBody, validatedQuery } from "./validation-decorators";
import { ZodValidatorAdapter } from "@expressots/core";

function fakeSchema(predicate: (value: unknown) => boolean) {
  return {
    safeParseAsync: async (data: unknown) =>
      predicate(data)
        ? { success: true as const, data }
        : { success: false as const, error: { issues: [{ message: "invalid" }] } },
  };
}

describe("ValidationService", () => {
  it("tracks enabled state and exposes helpers", () => {
    const service = new ValidationService();
    expect(service.isEnabled()).toBe(false);

    service.enable({
      adapters: [ZodValidatorAdapter],
      smartDetection: false,
      autoDetection: false,
    });
    expect(service.isEnabled()).toBe(true);
    expect(service.getRegistry()).toBeDefined();
    expect(service.getSmartDetector()).toBeDefined();
    expect(service.getErrorFormatter()).toBeDefined();

    service.disable();
    expect(service.isEnabled()).toBe(false);
  });

  it("returns args unchanged when validation is disabled", async () => {
    const service = new ValidationService();
    class Controller {
      create(_dto: unknown): void {}
    }
    const args = [{ ok: true }];
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;

    const result = await service.validateParameters({} as Request, res, Controller, "create", args);

    expect(result).toBe(args);
  });

  it("validates decorated body parameters and returns transformed args", async () => {
    const service = new ValidationService();
    service.enable({
      adapters: [ZodValidatorAdapter],
      smartDetection: false,
      autoDetection: false,
    });

    class CreateDto {}
    class Controller {
      create(_dto: CreateDto): void {}
    }
    const schema = fakeSchema((value) => typeof value === "object" && value !== null);
    validatedBody(schema)(Controller.prototype, "create", 0);

    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
    const req = { body: { name: "Ada" } } as Request;

    const result = await service.validateParameters(req, res, Controller, "create", [req.body]);

    expect(result).toEqual([{ name: "Ada" }]);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns validation errors for invalid decorated query parameters", async () => {
    const service = new ValidationService();
    service.enable({
      adapters: [ZodValidatorAdapter],
      smartDetection: false,
      autoDetection: false,
    });

    class ItemsController {
      search(_page: string): void {}
    }
    validatedQuery(fakeSchema(() => false))(ItemsController.prototype, "search", 0);

    const req = { query: { page: "bad" } } as unknown as Request;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;

    const result = await service.validateParameters(req, res, ItemsController, "search", ["bad"]);

    expect(result).toBeNull();
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
