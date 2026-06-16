/**
 * Unit tests for validated parameter decorators, including the
 * single-parameter form `@validatedParam("name", schema)`.
 */
import "reflect-metadata";
import { METADATA_KEY } from "./constants";
import {
  validatedBody,
  validatedParam,
  validatedQuery,
  validatedHeaders,
  getValidationMetadata,
  hasValidationMetadata,
  Validate,
  ValidationSchemaMetadata,
} from "./validation-decorators";
import { ValidationService } from "./validation-service";
import { ZodValidatorAdapter } from "@expressots/core";
import type { Request, Response } from "express";

/**
 * Minimal zod-like schema recognized by the registry's structural checks.
 * Succeeds when the value matches the given predicate.
 */
function fakeSchema(predicate: (value: unknown) => boolean, message = "Invalid value") {
  return {
    safeParseAsync: async (data: unknown) => {
      if (predicate(data)) {
        return { success: true, data };
      }
      return {
        success: false,
        error: { issues: [{ path: [], message, code: "custom" }] },
      };
    },
  };
}

function getStoredValidation(controller: object, method: string): Array<ValidationSchemaMetadata> {
  return Reflect.getOwnMetadata(METADATA_KEY.validationSchema, controller, method) || [];
}

describe("validated parameter decorators", () => {
  describe("argument parsing", () => {
    it("stores only parameter metadata for the name-only form (backward compatible)", () => {
      class TestController {
        getUser(_id: string): void {}
      }

      validatedParam("id")(TestController.prototype, "getUser", 0);

      expect(getStoredValidation(TestController, "getUser")).toHaveLength(0);

      const params = Reflect.getOwnMetadata(METADATA_KEY.controllerParameter, TestController);
      expect(params.getUser[0]).toMatchObject({
        index: 0,
        injectRoot: false,
        parameterName: "id",
      });
    });

    it("stores schema and paramName for the two-argument form (name, schema)", () => {
      class TestController {
        getUser(_id: string): void {}
      }
      const schema = fakeSchema(() => true);

      validatedParam("id", schema)(TestController.prototype, "getUser", 0);

      const metadata = getStoredValidation(TestController, "getUser");
      expect(metadata).toHaveLength(1);
      expect(metadata[0]).toMatchObject({
        index: 0,
        source: "params",
        schema,
        paramName: "id",
      });
    });

    it("treats an options bag as options in the (name, options) form", () => {
      class TestController {
        search(_page: string): void {}
      }

      validatedQuery("page", { group: "list" })(TestController.prototype, "search", 0);

      // Options without a schema do not create validation metadata
      expect(getStoredValidation(TestController, "search")).toHaveLength(0);

      const params = Reflect.getOwnMetadata(METADATA_KEY.controllerParameter, TestController);
      expect(params.search[0]).toMatchObject({ parameterName: "page" });
    });

    it("supports (schema, options) for whole-object validation", () => {
      class TestController {
        create(_body: unknown): void {}
      }
      const schema = fakeSchema(() => true);

      validatedBody(schema, { group: "create" })(TestController.prototype, "create", 0);

      const metadata = getStoredValidation(TestController, "create");
      expect(metadata).toHaveLength(1);
      expect(metadata[0]).toMatchObject({
        source: "body",
        schema,
        options: { group: "create" },
      });
      expect(metadata[0].paramName).toBeUndefined();
    });

    it("getValidationMetadata returns stored entries", () => {
      class TestController {
        handle(_value: unknown): void {}
      }
      const schema = fakeSchema(() => true);

      validatedHeaders("x-api-key", schema)(TestController.prototype, "handle", 0);

      const metadata = getValidationMetadata(TestController, "handle");
      expect(metadata).toHaveLength(1);
      expect(metadata[0].paramName).toBe("x-api-key");
      expect(metadata[0].source).toBe("headers");
    });

    it("hasValidationMetadata reflects whether a method was decorated", () => {
      class TestController {
        decorated(_value: unknown): void {}
        plain(): void {}
      }
      const schema = fakeSchema(() => true);
      Validate(schema)(TestController.prototype, "decorated", 0);

      expect(hasValidationMetadata(TestController, "decorated")).toBe(true);
      expect(hasValidationMetadata(TestController, "plain")).toBe(false);
    });
  });

  describe("single-parameter validation through ValidationService", () => {
    function buildService(): ValidationService {
      const service = new ValidationService();
      service.enable({
        adapters: [ZodValidatorAdapter],
        smartDetection: false,
        autoDetection: false,
      });
      return service;
    }

    function mockResponse(): { res: Response; getStatus: () => number | undefined } {
      let status: number | undefined;
      const res = {
        status(code: number) {
          status = code;
          return this;
        },
        json: jest.fn(),
      } as unknown as Response;
      return { res, getStatus: () => status };
    }

    it("validates only the named route param and passes the validated value through", async () => {
      class TestController {
        getUser(_id: string): void {}
      }
      const uuidLike = fakeSchema(
        (value) => typeof value === "string" && /^[0-9a-f-]{36}$/.test(value),
        "Invalid UUID",
      );
      validatedParam("id", uuidLike)(TestController.prototype, "getUser", 0);

      const service = buildService();
      const { res } = mockResponse();
      const req = {
        params: { id: "123e4567-e89b-12d3-a456-426614174000" },
        body: {},
        query: {},
        headers: {},
      } as unknown as Request;

      const result = await service.validateParameters(req, res, TestController, "getUser", [
        "123e4567-e89b-12d3-a456-426614174000",
      ]);

      expect(result).toEqual(["123e4567-e89b-12d3-a456-426614174000"]);
    });

    it("rejects an invalid named param with a 400 and scopes the error path to the param name", async () => {
      class TestController {
        getUser(_id: string): void {}
      }
      const uuidLike = fakeSchema(
        (value) => typeof value === "string" && /^[0-9a-f-]{36}$/.test(value),
        "Invalid UUID",
      );
      validatedParam("id", uuidLike)(TestController.prototype, "getUser", 0);

      const service = buildService();
      const { res, getStatus } = mockResponse();
      const req = {
        params: { id: "not-a-uuid" },
        body: {},
        query: {},
        headers: {},
      } as unknown as Request;

      const result = await service.validateParameters(req, res, TestController, "getUser", [
        "not-a-uuid",
      ]);

      expect(result).toBeNull();
      expect(getStatus()).toBe(400);

      const payload = (res.json as jest.Mock).mock.calls[0][0];
      const serialized = JSON.stringify(payload);
      expect(serialized).toContain("id");
    });

    it("extracts named header values case-insensitively", async () => {
      class TestController {
        handle(_key: string): void {}
      }
      const nonEmpty = fakeSchema(
        (value) => typeof value === "string" && value.length > 0,
        "Required",
      );
      validatedHeaders("X-Api-Key", nonEmpty)(TestController.prototype, "handle", 0);

      const service = buildService();
      const { res } = mockResponse();
      const req = {
        params: {},
        body: {},
        query: {},
        headers: { "x-api-key": "secret" },
      } as unknown as Request;

      const result = await service.validateParameters(req, res, TestController, "handle", [
        "secret",
      ]);

      expect(result).toEqual(["secret"]);
    });
  });
});
