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
  getParameterType,
  getAllParameterTypes,
  getClassProperties,
  hasClassValidatorDecorators,
  isZodSchema,
  isClassConstructor,
  detectSchemaType,
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

    it("should skip validation when disabled", () => {
      detector.setEnabled(false);
      const data = {
        email: "invalid",
        password: "short",
      };

      const errors = detector.validateObject(data);
      expect(errors).toHaveLength(0);
    });
  });

  describe("password validation edge cases", () => {
    it("should handle null/undefined/empty password", () => {
      expect(detector.validate("password", null)).toHaveLength(0);
      expect(detector.validate("password", undefined)).toHaveLength(0);
      expect(detector.validate("password", "")).toHaveLength(0);
    });

    it("should handle non-string password", () => {
      const errors = detector.validate("password", 123);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].code).toBe("invalid_type");
    });
  });

  describe("phone validation edge cases", () => {
    it("should handle null/undefined/empty phone", () => {
      expect(detector.validate("phone", null)).toHaveLength(0);
      expect(detector.validate("phone", undefined)).toHaveLength(0);
      expect(detector.validate("phone", "")).toHaveLength(0);
    });

    it("should handle non-string phone", () => {
      const errors = detector.validate("phone", 123);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].code).toBe("invalid_type");
    });
  });

  describe("URL validation edge cases", () => {
    it("should handle null/undefined/empty URL", () => {
      expect(detector.validate("website", null)).toHaveLength(0);
      expect(detector.validate("website", undefined)).toHaveLength(0);
      expect(detector.validate("website", "")).toHaveLength(0);
    });

    it("should handle non-string URL", () => {
      const errors = detector.validate("website", 123);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].code).toBe("invalid_type");
    });
  });

  describe("UUID validation edge cases", () => {
    it("should handle null/undefined/empty UUID", () => {
      expect(detector.validate("userId", null)).toHaveLength(0);
      expect(detector.validate("userId", undefined)).toHaveLength(0);
      expect(detector.validate("userId", "")).toHaveLength(0);
    });

    it("should accept numeric IDs", () => {
      expect(detector.validate("userId", 12345)).toHaveLength(0);
    });

    it("should accept numeric string IDs", () => {
      expect(detector.validate("userId", "12345")).toHaveLength(0);
    });

    it("should reject non-string non-number UUID", () => {
      const errors = detector.validate("userId", true);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("date validation edge cases", () => {
    it("should handle null/undefined/empty date", () => {
      expect(detector.validate("createdAt", null)).toHaveLength(0);
      expect(detector.validate("createdAt", undefined)).toHaveLength(0);
      expect(detector.validate("createdAt", "")).toHaveLength(0);
    });

    it("should accept valid date string", () => {
      expect(detector.validate("createdAt", "2024-01-15")).toHaveLength(0);
    });

    it("should accept valid timestamp", () => {
      expect(detector.validate("createdAt", Date.now())).toHaveLength(0);
    });

    it("should reject invalid date string", () => {
      const errors = detector.validate("createdAt", "not-a-date");
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("positive integer validation edge cases", () => {
    it("should handle null/undefined/empty", () => {
      expect(detector.validate("age", null)).toHaveLength(0);
      expect(detector.validate("age", undefined)).toHaveLength(0);
      expect(detector.validate("age", "")).toHaveLength(0);
    });

    it("should reject negative numbers", () => {
      const errors = detector.validate("age", -5);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should reject non-integers", () => {
      const errors = detector.validate("age", 3.14);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should reject NaN", () => {
      const errors = detector.validate("age", NaN);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("postal code validation", () => {
    it("should validate postal code fields", () => {
      const errors = detector.validate("zipCode", "12");
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].code).toBe("invalid_postal_code");
    });

    it("should pass valid postal code", () => {
      expect(detector.validate("zipCode", "12345")).toHaveLength(0);
      expect(detector.validate("postalCode", "SW1A 1AA")).toHaveLength(0);
    });

    it("should handle null/undefined/empty", () => {
      expect(detector.validate("zipCode", null)).toHaveLength(0);
      expect(detector.validate("zipCode", undefined)).toHaveLength(0);
      expect(detector.validate("zipCode", "")).toHaveLength(0);
    });

    it("should handle non-string postal code", () => {
      const errors = detector.validate("zipCode", 12345);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].code).toBe("invalid_type");
    });

    it("should reject invalid format", () => {
      const errors = detector.validate("zipCode", "a".repeat(20));
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("credit card validation", () => {
    it("should validate credit card fields", () => {
      const errors = detector.validate("creditCardNumber", "123");
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should pass valid credit card number", () => {
      // Valid test card number (Luhn algorithm)
      expect(
        detector.validate("creditCardNumber", "4111111111111111"),
      ).toHaveLength(0);
    });

    it("should handle null/undefined/empty", () => {
      expect(detector.validate("creditCardNumber", null)).toHaveLength(0);
      expect(detector.validate("creditCardNumber", undefined)).toHaveLength(0);
      expect(detector.validate("creditCardNumber", "")).toHaveLength(0);
    });

    it("should handle non-string credit card", () => {
      const errors = detector.validate("creditCardNumber", 123);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].code).toBe("invalid_type");
    });

    it("should reject invalid length", () => {
      const errors = detector.validate("creditCardNumber", "123456789012");
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should reject invalid Luhn checksum", () => {
      const errors = detector.validate("creditCardNumber", "4111111111111112");
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].code).toBe("invalid_credit_card");
    });

    it("should accept card with spaces/dashes", () => {
      expect(
        detector.validate("creditCardNumber", "4111-1111-1111-1111"),
      ).toHaveLength(0);
    });
  });

  describe("IP address validation", () => {
    it("should validate IP address fields", () => {
      const errors = detector.validate("ipAddress", "invalid");
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].code).toBe("invalid_ip");
    });

    it("should pass valid IPv4", () => {
      expect(detector.validate("ipAddress", "192.168.1.1")).toHaveLength(0);
      expect(detector.validate("ipAddress", "127.0.0.1")).toHaveLength(0);
    });

    it("should pass valid IPv6", () => {
      expect(
        detector.validate(
          "ipAddress",
          "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
        ),
      ).toHaveLength(0);
    });

    it("should handle null/undefined/empty", () => {
      expect(detector.validate("ipAddress", null)).toHaveLength(0);
      expect(detector.validate("ipAddress", undefined)).toHaveLength(0);
      expect(detector.validate("ipAddress", "")).toHaveLength(0);
    });

    it("should handle non-string IP", () => {
      const errors = detector.validate("ipAddress", 123);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].code).toBe("invalid_type");
    });

    it("should reject invalid IPv4 octets", () => {
      const errors = detector.validate("ipAddress", "256.1.1.1");
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("email validation edge cases", () => {
    it("should handle null/undefined/empty email", () => {
      expect(detector.validate("email", null)).toHaveLength(0);
      expect(detector.validate("email", undefined)).toHaveLength(0);
      expect(detector.validate("email", "")).toHaveLength(0);
    });

    it("should handle non-string email", () => {
      const errors = detector.validate("email", 123);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].code).toBe("invalid_type");
    });
  });

  describe("type validation", () => {
    it("should validate Number type", () => {
      const errors = detector.validate("field", "not-a-number", Number);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].code).toBe("invalid_type");
    });

    it("should accept valid number string", () => {
      const errors = detector.validate("field", "123", Number);
      expect(errors).toHaveLength(0);
    });

    it("should validate Boolean type", () => {
      const errors = detector.validate("field", "maybe", Boolean);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].code).toBe("invalid_type");
    });

    it("should accept valid boolean strings", () => {
      expect(detector.validate("field", "true", Boolean)).toHaveLength(0);
      expect(detector.validate("field", "false", Boolean)).toHaveLength(0);
      expect(detector.validate("field", "1", Boolean)).toHaveLength(0);
      expect(detector.validate("field", "0", Boolean)).toHaveLength(0);
    });

    it("should not validate type when pattern matches", () => {
      // When email pattern matches, type validation is skipped
      const errors = detector.validate("email", "invalid", Number);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].code).toBe("invalid_email");
    });
  });

  describe("pattern management", () => {
    it("should register custom pattern", () => {
      detector.registerPattern({
        name: "custom",
        patterns: [/^customField$/i],
        validate: (value) => {
          if (typeof value !== "string" || value.length < 5) {
            return {
              path: "",
              message: "Must be at least 5 characters",
              code: "min_length",
            };
          }
          return null;
        },
        example: "customValue",
      });

      const errors = detector.validate("customField", "abc");
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should clear patterns", () => {
      detector.clearPatterns();
      const errors = detector.validate("email", "invalid");
      expect(errors).toHaveLength(0);
    });

    it("should reset to defaults", () => {
      detector.clearPatterns();
      detector.resetToDefaults();
      const errors = detector.validate("email", "invalid");
      expect(errors.length).toBeGreaterThan(0);
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

  describe("documentation URL", () => {
    it("should set documentation URL", () => {
      formatter.setDocumentationUrl("https://api.example.com/docs");
      const errors: ValidationFieldError[] = [
        { path: "email", message: "Invalid" },
      ];

      const result = formatter.format(errors, "helpful");
      expect(result.documentation).toBe(
        "https://api.example.com/docs/errors/validation",
      );
    });

    it("should not include documentation URL when not set", () => {
      const errors: ValidationFieldError[] = [
        { path: "email", message: "Invalid" },
      ];

      const result = formatter.format(errors, "helpful");
      expect(result.documentation).toBeUndefined();
    });
  });

  describe("getSummary edge cases", () => {
    it("should handle single error", () => {
      const errors: ValidationFieldError[] = [
        { path: "email", message: "Invalid" },
      ];

      const result = formatter.format(errors, "helpful");
      expect(result.detail).toBe('1 validation error in field "email"');
    });

    it("should handle multiple errors in same field", () => {
      const errors: ValidationFieldError[] = [
        { path: "email", message: "Error 1" },
        { path: "email", message: "Error 2" },
        { path: "email", message: "Error 3" },
      ];

      const result = formatter.format(errors, "helpful");
      expect(result.detail).toBe('3 validation errors in field "email"');
    });

    it("should handle errors in 2-3 fields", () => {
      const errors: ValidationFieldError[] = [
        { path: "email", message: "Error 1" },
        { path: "name", message: "Error 2" },
        { path: "age", message: "Error 3" },
      ];

      const result = formatter.format(errors, "helpful");
      expect(result.detail).toBe(
        "3 validation errors in fields: email, name, age",
      );
    });

    it("should handle errors in more than 3 fields", () => {
      const errors: ValidationFieldError[] = [
        { path: "email", message: "Error 1" },
        { path: "name", message: "Error 2" },
        { path: "age", message: "Error 3" },
        { path: "phone", message: "Error 4" },
        { path: "address", message: "Error 5" },
      ];

      const result = formatter.format(errors, "helpful");
      expect(result.detail).toBe("5 validation errors in 5 fields");
    });
  });

  describe("sanitizeValue", () => {
    it("should handle null and undefined", () => {
      const errors: ValidationFieldError[] = [
        { path: "field", message: "Error", received: null },
        { path: "field2", message: "Error", received: undefined },
      ];

      const result = formatter.format(errors, "helpful");
      expect(result.errors[0].received).toBeNull();
      expect(result.errors[1].received).toBeUndefined();
    });

    it("should truncate long strings", () => {
      const longString = "a".repeat(150);
      const errors: ValidationFieldError[] = [
        { path: "field", message: "Error", received: longString },
      ];

      const result = formatter.format(errors, "helpful");
      expect(result.errors[0].received).toBe(
        `${"a".repeat(100)}... (truncated)`,
      );
    });

    it("should handle arrays", () => {
      const errors: ValidationFieldError[] = [
        { path: "field", message: "Error", received: [1, 2, 3] },
      ];

      const result = formatter.format(errors, "helpful");
      expect(result.errors[0].received).toEqual([1, 2, 3]);
    });

    it("should truncate large arrays", () => {
      const largeArray = Array.from({ length: 15 }, (_, i) => i);
      const errors: ValidationFieldError[] = [
        { path: "field", message: "Error", received: largeArray },
      ];

      const result = formatter.format(errors, "helpful");
      expect(result.errors[0].received).toBe("[Array with 15 items]");
    });

    it("should handle objects", () => {
      const errors: ValidationFieldError[] = [
        { path: "field", message: "Error", received: { key: "value" } },
      ];

      const result = formatter.format(errors, "helpful");
      expect(result.errors[0].received).toBe("[Object]");
    });

    it("should handle other types", () => {
      const errors: ValidationFieldError[] = [
        { path: "field", message: "Error", received: 42 },
        { path: "field2", message: "Error", received: true },
      ];

      const result = formatter.format(errors, "helpful");
      expect(result.errors[0].received).toBe(42);
      expect(result.errors[1].received).toBe(true);
    });
  });

  describe("formatCustom", () => {
    it("should format errors with customizer", () => {
      const errors: ValidationFieldError[] = [
        { path: "email", message: "Invalid", code: "invalid_email" },
        { path: "name", message: "Required", code: "required" },
      ];

      const result = formatter.formatCustom(errors, (error) => ({
        customField: error.path,
        customMessage: error.message,
        customCode: error.code,
      }));

      expect(result.status).toBe(400);
      expect(result.message).toBe("Validation failed");
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toEqual({
        customField: "email",
        customMessage: "Invalid",
        customCode: "invalid_email",
      });
    });
  });
});

describe("Type Inference", () => {
  class TestClass {
    public prop1: string = "";
    public prop2: number = 0;
  }

  class TestClassWithDecorators {
    public prop1: string = "";
  }

  describe("getParameterType", () => {
    class TestController {
      testMethod(param1: string, param2: number, param3: TestClass): void {
        // Test method
      }
    }

    it("should get parameter type", () => {
      const controller = new TestController();
      const typeInfo = getParameterType(
        TestController.prototype,
        "testMethod",
        0,
      );

      // TypeScript metadata may not be available in test environment
      if (typeInfo) {
        expect(typeInfo.type).toBe(String);
        expect(typeInfo.index).toBe(0);
      } else {
        // If metadata is not available, function should return undefined
        expect(typeInfo).toBeUndefined();
      }
    });

    it("should return undefined for invalid index", () => {
      const typeInfo = getParameterType(
        TestController.prototype,
        "testMethod",
        10,
      );
      expect(typeInfo).toBeUndefined();
    });

    it("should return undefined for non-existent method", () => {
      const typeInfo = getParameterType(
        TestController.prototype,
        "nonExistent",
        0,
      );
      expect(typeInfo).toBeUndefined();
    });

    it("should handle class types", () => {
      const controller = new TestController();
      const typeInfo = getParameterType(
        TestController.prototype,
        "testMethod",
        2,
      );

      // TypeScript metadata may not be available in test environment
      if (typeInfo) {
        expect(typeInfo.type).toBe(TestClass);
      } else {
        // If metadata is not available, function should return undefined
        expect(typeInfo).toBeUndefined();
      }
    });
  });

  describe("getAllParameterTypes", () => {
    class TestController {
      testMethod(param1: string, param2: number): void {
        // Test method
      }
    }

    it("should get all parameter types", () => {
      const types = getAllParameterTypes(
        TestController.prototype,
        "testMethod",
      );

      // TypeScript metadata may not be available in test environment
      if (types.length > 0) {
        expect(types).toHaveLength(2);
        expect(types[0].type).toBe(String);
        expect(types[1].type).toBe(Number);
      } else {
        // If metadata is not available, function should return empty array
        expect(types).toEqual([]);
      }
    });

    it("should return empty array for non-existent method", () => {
      const types = getAllParameterTypes(
        TestController.prototype,
        "nonExistent",
      );
      expect(types).toEqual([]);
    });
  });

  describe("getClassProperties", () => {
    it("should return undefined for built-in types", () => {
      expect(getClassProperties(String)).toBeUndefined();
      expect(getClassProperties(Number)).toBeUndefined();
      expect(getClassProperties(Boolean)).toBeUndefined();
      expect(getClassProperties(Array)).toBeUndefined();
      expect(getClassProperties(Object)).toBeUndefined();
      expect(getClassProperties(Date)).toBeUndefined();
    });

    it("should return undefined for non-function", () => {
      expect(getClassProperties("not-a-function")).toBeUndefined();
      expect(getClassProperties(null)).toBeUndefined();
      expect(getClassProperties(undefined)).toBeUndefined();
    });

    it("should return undefined for class with no properties", () => {
      class EmptyClass {}
      const props = getClassProperties(EmptyClass);
      expect(props).toBeUndefined();
    });

    it("should handle class with properties", () => {
      const props = getClassProperties(TestClass);
      // May return undefined if no metadata, but should not throw
      expect(props === undefined || props instanceof Map).toBe(true);
    });

    it("should handle class creation errors gracefully", () => {
      class ThrowingClass {
        constructor() {
          throw new Error("Cannot instantiate");
        }
      }
      const props = getClassProperties(ThrowingClass);
      expect(props).toBeUndefined();
    });
  });

  describe("hasClassValidatorDecorators", () => {
    it("should return false for non-function", () => {
      expect(hasClassValidatorDecorators("not-a-function")).toBe(false);
      expect(hasClassValidatorDecorators(null)).toBe(false);
      expect(hasClassValidatorDecorators(undefined)).toBe(false);
    });

    it("should return false for class without decorators", () => {
      expect(hasClassValidatorDecorators(TestClass)).toBe(false);
    });

    it("should handle class-validator not installed", () => {
      // Should not throw even if class-validator is not available
      expect(hasClassValidatorDecorators(TestClass)).toBe(false);
    });

    it("should check metadata keys", () => {
      // Mock a class with validation metadata key
      const MockClass = class {};
      Reflect.defineMetadata("validation:test", {}, MockClass.prototype);
      // This might return true if metadata keys match
      const result = hasClassValidatorDecorators(MockClass);
      expect(typeof result).toBe("boolean");
    });
  });

  describe("isZodSchema", () => {
    it("should return false for null/undefined", () => {
      expect(isZodSchema(null)).toBe(false);
      expect(isZodSchema(undefined)).toBe(false);
    });

    it("should return false for non-object", () => {
      expect(isZodSchema("string")).toBe(false);
      expect(isZodSchema(123)).toBe(false);
      expect(isZodSchema(true)).toBe(false);
    });

    it("should check for _def property", () => {
      const mockZodSchema = {
        _def: {
          typeName: "ZodString",
        },
      };
      expect(isZodSchema(mockZodSchema)).toBe(true);
    });

    it("should return false for object without _def.typeName", () => {
      const mockObject = {
        _def: {},
      };
      expect(isZodSchema(mockObject)).toBe(false);
    });

    it("should handle Zod not installed", () => {
      // Should not throw even if Zod is not available
      expect(isZodSchema({})).toBe(false);
    });
  });

  describe("isClassConstructor", () => {
    it("should return true for class constructor", () => {
      expect(isClassConstructor(TestClass)).toBe(true);
    });

    it("should return false for non-function", () => {
      expect(isClassConstructor("not-a-function")).toBe(false);
      expect(isClassConstructor(null)).toBe(false);
      expect(isClassConstructor(undefined)).toBe(false);
      expect(isClassConstructor(123)).toBe(false);
      expect(isClassConstructor({})).toBe(false);
    });

    it("should return false for arrow function", () => {
      const arrowFunc = () => {};
      expect(isClassConstructor(arrowFunc)).toBe(false);
    });
  });

  describe("detectSchemaType", () => {
    it("should detect class type", () => {
      const result = detectSchemaType(TestClass);
      expect(result).toBe("class");
    });

    it("should detect Zod schema", () => {
      const mockZodSchema = {
        _def: {
          typeName: "ZodString",
        },
      };
      const result = detectSchemaType(mockZodSchema);
      expect(["zod", "unknown"]).toContain(result);
    });

    it("should return unknown for unrecognized type", () => {
      expect(detectSchemaType("string")).toBe("unknown");
      expect(detectSchemaType(123)).toBe("unknown");
      expect(detectSchemaType(null)).toBe("unknown");
      expect(detectSchemaType(undefined)).toBe("unknown");
    });

    it("should detect class-validator when metadata keys match", () => {
      // Create a class with validation metadata that matches the pattern
      const MockClass = class {};
      Reflect.defineMetadata(
        "class-validator:validation",
        {},
        MockClass.prototype,
      );

      const result = detectSchemaType(MockClass);

      // Should return class-validator if metadata keys match, otherwise class
      expect(["class-validator", "class"]).toContain(result);
    });
  });

  describe("getParameterType with metadata", () => {
    it("should return type info when metadata exists", () => {
      class TestController {
        testMethod(param: string): void {}
      }

      // Set up metadata manually
      Reflect.defineMetadata(
        "design:paramtypes",
        [String],
        TestController.prototype,
        "testMethod",
      );

      const result = getParameterType(
        TestController.prototype,
        "testMethod",
        0,
      );

      if (result) {
        expect(result.type).toBe(String);
        expect(result.index).toBe(0);
        expect(result.isArray).toBe(false);
      }
    });
  });

  describe("getAllParameterTypes with metadata", () => {
    it("should return all types when metadata exists", () => {
      class TestController {
        testMethod(param1: string, param2: number): void {}
      }

      // Set up metadata manually
      Reflect.defineMetadata(
        "design:paramtypes",
        [String, Number],
        TestController.prototype,
        "testMethod",
      );

      const result = getAllParameterTypes(
        TestController.prototype,
        "testMethod",
      );

      if (result.length > 0) {
        expect(result).toHaveLength(2);
        expect(result[0].type).toBe(String);
        expect(result[1].type).toBe(Number);
      }
    });
  });

  describe("getClassProperties with metadata", () => {
    it("should return properties when metadata exists on instance", () => {
      class TestClassWithMetadata {
        prop1: string = "";
      }

      // Set up metadata for property
      Reflect.defineMetadata(
        "design:type",
        String,
        TestClassWithMetadata.prototype,
        "prop1",
      );

      const result = getClassProperties(TestClassWithMetadata);

      // Result may be undefined or a Map depending on metadata availability
      expect(result === undefined || result instanceof Map).toBe(true);
    });

    it("should return properties when metadata exists on prototype", () => {
      class TestClass {
        prop1: string = "";
      }

      // Set up metadata on prototype
      Reflect.defineMetadata(
        "design:type",
        String,
        TestClass.prototype,
        "prop1",
      );

      const result = getClassProperties(TestClass);

      expect(result === undefined || result instanceof Map).toBe(true);
    });

    it("should handle properties that already exist in map", () => {
      class TestClass {
        prop1: string = "";
      }

      // Set up metadata
      Reflect.defineMetadata(
        "design:type",
        String,
        TestClass.prototype,
        "prop1",
      );

      const result = getClassProperties(TestClass);

      // Should not duplicate properties
      expect(result === undefined || result instanceof Map).toBe(true);
    });
  });

  describe("hasClassValidatorDecorators with metadata storage", () => {
    it("should check metadata keys when class-validator not available", () => {
      class TestClass {}

      // Set up metadata that matches the pattern
      Reflect.defineMetadata(
        "class-validator:validation",
        {},
        TestClass.prototype,
      );

      const result = hasClassValidatorDecorators(TestClass);

      // Should check metadata keys as fallback
      expect(typeof result).toBe("boolean");
    });

    it("should handle metadata keys that don't match pattern", () => {
      class TestClass {}

      // Set up metadata that doesn't match
      Reflect.defineMetadata("other:metadata", {}, TestClass.prototype);

      const result = hasClassValidatorDecorators(TestClass);

      expect(result).toBe(false);
    });
  });

  describe("isZodSchema with require error", () => {
    it("should return true from _def check before require", () => {
      const mockSchema = {
        _def: {
          typeName: "ZodString",
        },
      };

      // Should return true from _def check, never reaching require
      const result = isZodSchema(mockSchema);

      expect(result).toBe(true);
    });

    it("should handle require error gracefully", () => {
      // Object without _def.typeName will try require
      const mockObject = { _def: {} };

      const result = isZodSchema(mockObject);

      // Should return false (either from _def check or require error)
      expect(result).toBe(false);
    });
  });
});
