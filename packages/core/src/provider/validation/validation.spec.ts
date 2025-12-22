/**
 * Validation System Tests
 * @module @expressots/core/validation
 */

import "reflect-metadata";
import {
  ValidationRegistry,
  SmartFieldDetector,
  HelpfulErrorFormatter,
  IValidationAdapter,
  ValidationResult,
  ValidationFieldError,
} from "./index";

// Mock validation adapter for testing
class MockValidationAdapter implements IValidationAdapter {
  readonly name = "mock";
  readonly priority = 50;

  canHandle(schema: unknown): boolean {
    return (
      typeof schema === "object" && schema !== null && "mockSchema" in schema
    );
  }

  async validate(data: unknown): Promise<ValidationResult> {
    if (data && typeof data === "object" && "invalid" in data) {
      return {
        success: false,
        errors: [
          {
            path: "field",
            message: "Invalid value",
            code: "invalid",
          },
        ],
      };
    }
    return { success: true, data };
  }
}

describe("ValidationRegistry", () => {
  let registry: ValidationRegistry;

  beforeEach(() => {
    registry = new ValidationRegistry();
  });

  describe("adapter registration", () => {
    it("should register an adapter", () => {
      const adapter = new MockValidationAdapter();
      registry.register(adapter);

      expect(registry.has("mock")).toBe(true);
      expect(registry.get("mock")).toBe(adapter);
    });

    it("should register multiple adapters", () => {
      const adapter1 = new MockValidationAdapter();
      const adapter2: IValidationAdapter = {
        name: "test",
        priority: 100,
        canHandle: () => false,
        validate: async () => ({ success: true }),
      };

      registry.registerAll([adapter1, adapter2]);

      expect(registry.has("mock")).toBe(true);
      expect(registry.has("test")).toBe(true);
    });

    it("should unregister an adapter", () => {
      const adapter = new MockValidationAdapter();
      registry.register(adapter);

      expect(registry.has("mock")).toBe(true);
      registry.unregister("mock");
      expect(registry.has("mock")).toBe(false);
    });

    it("should clear all adapters", () => {
      registry.register(new MockValidationAdapter());
      registry.clear();

      expect(registry.getAll().length).toBe(0);
    });
  });

  describe("adapter detection", () => {
    it("should detect the correct adapter for a schema", () => {
      const adapter = new MockValidationAdapter();
      registry.register(adapter);

      const detected = registry.detect({ mockSchema: true });
      expect(detected).toBe(adapter);
    });

    it("should return undefined if no adapter handles the schema", () => {
      const detected = registry.detect({ unknown: true });
      expect(detected).toBeUndefined();
    });

    it("should prioritize adapters by priority", () => {
      const lowPriority: IValidationAdapter = {
        name: "low",
        priority: 10,
        canHandle: () => true,
        validate: async () => ({ success: true }),
      };

      const highPriority: IValidationAdapter = {
        name: "high",
        priority: 100,
        canHandle: () => true,
        validate: async () => ({ success: true }),
      };

      registry.register(lowPriority);
      registry.register(highPriority);

      const detected = registry.detect({});
      expect(detected?.name).toBe("high");
    });
  });

  describe("validation", () => {
    it("should validate data successfully", async () => {
      const adapter = new MockValidationAdapter();
      registry.register(adapter);

      const result = await registry.validate(
        { valid: true },
        { mockSchema: true },
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ valid: true });
    });

    it("should return errors for invalid data", async () => {
      const adapter = new MockValidationAdapter();
      registry.register(adapter);

      const result = await registry.validate(
        { invalid: true },
        { mockSchema: true },
      );

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0].path).toBe("field");
    });

    it("should return success if no adapter handles the schema", async () => {
      const result = await registry.validate({ data: true }, { unknown: true });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ data: true });
    });
  });

  describe("error formatting", () => {
    it("should format errors in helpful format", () => {
      const errors: ValidationFieldError[] = [
        {
          path: "email",
          message: "Invalid email",
          code: "invalid_email",
          received: "not-an-email",
          example: "user@example.com",
        },
      ];

      const formatted = registry.formatErrors(errors);

      expect(formatted.type).toBe("validation-error");
      expect(formatted.status).toBe(400);
      expect(formatted.errors).toHaveLength(1);
    });

    it("should format errors in simple format", () => {
      registry.configure({ errorFormat: "simple" });

      const errors: ValidationFieldError[] = [
        { path: "name", message: "Required" },
      ];

      const formatted = registry.formatErrors(errors);

      expect(formatted.message).toBe("Validation failed");
      expect(formatted.errors).toHaveLength(1);
    });

    it("should format errors in RFC 7807 format", () => {
      registry.configure({ errorFormat: "rfc7807" });

      const errors: ValidationFieldError[] = [
        { path: "age", message: "Must be a number", code: "invalid_type" },
      ];

      const formatted = registry.formatErrors(errors);

      expect(formatted.type).toBe("https://expressots.com/errors/validation");
      expect(formatted.title).toBe("Validation Failed");
    });
  });
});

describe("SmartFieldDetector", () => {
  let detector: SmartFieldDetector;

  beforeEach(() => {
    detector = new SmartFieldDetector();
  });

  describe("email detection", () => {
    it("should validate email fields", () => {
      const errors = detector.validate("email", "invalid-email");
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].code).toBe("invalid_email");
    });

    it("should pass valid email", () => {
      const errors = detector.validate("email", "user@example.com");
      expect(errors).toHaveLength(0);
    });

    it("should detect email in field name variations", () => {
      expect(detector.validate("userEmail", "invalid").length).toBeGreaterThan(
        0,
      );
      expect(
        detector.validate("email_address", "invalid").length,
      ).toBeGreaterThan(0);
    });
  });

  describe("password detection", () => {
    it("should require minimum length for password fields", () => {
      const errors = detector.validate("password", "short");
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].code).toBe("min_length");
    });

    it("should pass valid password", () => {
      const errors = detector.validate("password", "securepassword123");
      expect(errors).toHaveLength(0);
    });
  });

  describe("phone detection", () => {
    it("should validate phone number fields", () => {
      const errors = detector.validate("phoneNumber", "123");
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should pass valid phone number", () => {
      const errors = detector.validate("phone", "+1234567890123");
      expect(errors).toHaveLength(0);
    });
  });

  describe("url detection", () => {
    it("should validate URL fields", () => {
      const errors = detector.validate("website", "not-a-url");
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should pass valid URL", () => {
      const errors = detector.validate("websiteUrl", "https://example.com");
      expect(errors).toHaveLength(0);
    });
  });

  describe("uuid detection", () => {
    it("should validate UUID fields", () => {
      const errors = detector.validate("userId", "not-a-uuid");
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should pass valid UUID", () => {
      const errors = detector.validate(
        "userId",
        "550e8400-e29b-41d4-a716-446655440000",
      );
      expect(errors).toHaveLength(0);
    });

    it("should pass numeric IDs", () => {
      const errors = detector.validate("userId", "12345");
      expect(errors).toHaveLength(0);
    });
  });

  describe("date detection", () => {
    it("should validate date fields", () => {
      const errors = detector.validate("createdAt", "not-a-date");
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should pass valid date string", () => {
      const errors = detector.validate("createdAt", "2024-01-15T10:30:00Z");
      expect(errors).toHaveLength(0);
    });

    it("should pass Date object", () => {
      const errors = detector.validate("updatedAt", new Date());
      expect(errors).toHaveLength(0);
    });
  });

  describe("positive integer detection", () => {
    it("should validate age fields", () => {
      const errors = detector.validate("age", -5);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should pass valid age", () => {
      const errors = detector.validate("age", 25);
      expect(errors).toHaveLength(0);
    });

    it("should detect count fields", () => {
      const errors = detector.validate("itemCount", -1);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("enable/disable", () => {
    it("should skip validation when disabled", () => {
      detector.setEnabled(false);
      const errors = detector.validate("email", "invalid");
      expect(errors).toHaveLength(0);
    });

    it("should validate when re-enabled", () => {
      detector.setEnabled(false);
      detector.setEnabled(true);
      const errors = detector.validate("email", "invalid");
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("object validation", () => {
    it("should validate all fields in an object", () => {
      const data = {
        email: "invalid",
        password: "short",
        age: 25,
      };

      const errors = detector.validateObject(data);

      expect(errors.length).toBe(2); // email and password errors
    });
  });
});

describe("HelpfulErrorFormatter", () => {
  let formatter: HelpfulErrorFormatter;

  beforeEach(() => {
    formatter = new HelpfulErrorFormatter();
  });

  describe("helpful format", () => {
    it("should format errors with all helpful fields", () => {
      const errors: ValidationFieldError[] = [
        {
          path: "email",
          message: "Invalid email",
          code: "invalid_email",
          received: "not@email",
          expected: "valid email",
          example: "user@example.com",
          hint: "Check the @ symbol",
        },
      ];

      const result = formatter.format(errors, "helpful");

      expect(result.type).toBe("validation-error");
      expect(result.title).toBe("Validation Failed");
      expect(result.status).toBe(400);
      expect(result.errors[0]).toMatchObject({
        field: "email",
        message: "Invalid email",
        example: "user@example.com",
        hint: "Check the @ symbol",
      });
    });
  });

  describe("simple format", () => {
    it("should format errors simply", () => {
      const errors: ValidationFieldError[] = [
        { path: "name", message: "Required" },
      ];

      const result = formatter.format(errors, "simple");

      expect(result.message).toBe("Validation failed");
      expect(result.errors[0]).toEqual({ field: "name", message: "Required" });
    });
  });

  describe("rfc7807 format", () => {
    it("should format errors according to RFC 7807", () => {
      const errors: ValidationFieldError[] = [
        { path: "user.email", message: "Invalid", code: "invalid" },
      ];

      const result = formatter.format(errors, "rfc7807");

      expect(result.type).toBe("https://expressots.com/errors/validation");
      expect(result.title).toBe("Validation Failed");
      expect(result.errors[0]).toMatchObject({
        pointer: "/user/email",
        title: "Invalid",
        code: "invalid",
      });
    });
  });

  describe("flat format", () => {
    it("should combine errors by field", () => {
      const errors: ValidationFieldError[] = [
        { path: "email", message: "Required" },
        { path: "email", message: "Invalid format" },
        { path: "name", message: "Too short" },
      ];

      const result = formatter.format(errors, "flat");

      expect(result.errors).toHaveLength(2);
    });
  });

  describe("grouping", () => {
    it("should group errors by field", () => {
      const errors: ValidationFieldError[] = [
        { path: "email", message: "Error 1" },
        { path: "email", message: "Error 2" },
        { path: "name", message: "Error 3" },
      ];

      const grouped = formatter.groupByField(errors);

      expect(Object.keys(grouped)).toEqual(["email", "name"]);
      expect(grouped.email).toHaveLength(2);
      expect(grouped.name).toHaveLength(1);
    });

    it("should get first error per field", () => {
      const errors: ValidationFieldError[] = [
        { path: "email", message: "First" },
        { path: "email", message: "Second" },
        { path: "name", message: "Only" },
      ];

      const first = formatter.getFirstErrorPerField(errors);

      expect(first).toHaveLength(2);
      expect(first[0].message).toBe("First");
      expect(first[1].message).toBe("Only");
    });
  });
});
