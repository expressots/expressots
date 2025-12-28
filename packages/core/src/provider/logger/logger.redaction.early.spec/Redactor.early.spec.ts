// Unit tests for: Redactor class

import { Redactor, getDefaultRedactionConfig } from "../logger.redaction";

describe("Redactor", () => {
  describe("constructor", () => {
    it("should create redactor with default config", () => {
      // Act
      const redactor = new Redactor();

      // Assert
      expect(redactor).toBeDefined();
    });

    it("should create redactor with custom config", () => {
      // Arrange
      const config = {
        enabled: true,
        replacement: "***",
        fieldPatterns: ["password"],
        valuePatterns: [],
        partialRedaction: false,
        revealLastChars: 4,
        maxDepth: 10,
        whitelist: [],
      };

      // Act
      const redactor = new Redactor(config);

      // Assert
      expect(redactor).toBeDefined();
    });
  });

  describe("configure()", () => {
    it("should update configuration", () => {
      // Arrange
      const redactor = new Redactor();
      const newConfig = {
        replacement: "XXX",
        fieldPatterns: ["secret"],
      };

      // Act
      redactor.configure(newConfig);

      // Assert
      const config = (redactor as any).config;
      expect(config.replacement).toBe("XXX");
      expect(config.fieldPatterns).toContain("secret");
    });

    it("should rebuild field pattern set", () => {
      // Arrange
      const redactor = new Redactor();
      const newConfig = {
        fieldPatterns: ["password", "token"],
      };

      // Act
      redactor.configure(newConfig);

      // Assert
      expect(redactor.shouldRedactField("password")).toBe(true);
      expect(redactor.shouldRedactField("token")).toBe(true);
    });
  });

  describe("addFieldPatterns()", () => {
    it("should add field patterns", () => {
      // Arrange
      const redactor = new Redactor();

      // Act
      redactor.addFieldPatterns("customField", "anotherField");

      // Assert
      expect(redactor.shouldRedactField("customField")).toBe(true);
      expect(redactor.shouldRedactField("anotherField")).toBe(true);
    });
  });

  describe("addValuePatterns()", () => {
    it("should add value patterns", () => {
      // Arrange
      const redactor = new Redactor();
      const pattern = {
        name: "custom",
        pattern: /test-\d+/,
      };

      // Act
      redactor.addValuePatterns(pattern);

      // Assert
      const result = redactor.redactString("test-123");
      expect(result).not.toBe("test-123");
    });
  });

  describe("addWhitelist()", () => {
    it("should add fields to whitelist", () => {
      // Arrange
      const redactor = new Redactor();
      redactor.addFieldPatterns("password");

      // Act
      redactor.addWhitelist("password");

      // Assert
      expect(redactor.shouldRedactField("password")).toBe(false);
    });
  });

  describe("redact()", () => {
    it("should return value unchanged when disabled", () => {
      // Arrange
      const redactor = new Redactor({ enabled: false });
      const data = { password: "secret123" };

      // Act
      const result = redactor.redact(data);

      // Assert
      expect(result).toEqual(data);
    });

    it("should redact sensitive fields", () => {
      // Arrange
      const redactor = new Redactor();
      const data = { password: "secret123", username: "user" };

      // Act
      const result = redactor.redact(data);

      // Assert
      expect(result.password).not.toBe("secret123");
      expect(result.username).toBe("user");
    });

    it("should handle null and undefined", () => {
      // Arrange
      const redactor = new Redactor();

      // Act
      const nullResult = redactor.redact(null);
      const undefinedResult = redactor.redact(undefined);

      // Assert
      expect(nullResult).toBeNull();
      expect(undefinedResult).toBeUndefined();
    });

    it("should handle primitives", () => {
      // Arrange
      const redactor = new Redactor();

      // Act
      const stringResult = redactor.redact("test");
      const numberResult = redactor.redact(123);
      const booleanResult = redactor.redact(true);

      // Assert
      expect(stringResult).toBeDefined();
      expect(numberResult).toBe(123);
      expect(booleanResult).toBe(true);
    });

    it("should handle arrays", () => {
      // Arrange
      const redactor = new Redactor();
      const data = [{ password: "secret1" }, { password: "secret2" }];

      // Act
      const result = redactor.redact(data);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].password).not.toBe("secret1");
      expect(result[1].password).not.toBe("secret2");
    });

    it("should handle nested objects", () => {
      // Arrange
      const redactor = new Redactor();
      const data = {
        user: {
          password: "secret",
          email: "user@example.com",
        },
      };

      // Act
      const result = redactor.redact(data);

      // Assert
      expect(result.user.password).not.toBe("secret");
      expect(result.user.email).toBe("user@example.com");
    });

    it("should handle circular references", () => {
      // Arrange
      const redactor = new Redactor();
      const data: any = { password: "secret" };
      data.self = data;

      // Act
      const result = redactor.redact(data);

      // Assert
      expect(result.password).not.toBe("secret");
      expect(result.self).toBe("[Circular Reference]");
    });

    it("should respect max depth", () => {
      // Arrange
      const redactor = new Redactor({ maxDepth: 2 });
      const data: any = { level1: { level2: { level3: { password: "secret" } } } };

      // Act
      const result = redactor.redact(data);

      // Assert
      // At depth 3 (level3), it exceeds maxDepth 2, so level3 becomes "[Max Depth Exceeded]"
      expect(result.level1.level2.level3).toBe("[Max Depth Exceeded]");
    });

    it("should handle Date objects", () => {
      // Arrange
      const redactor = new Redactor();
      const date = new Date("2024-01-01");
      const data = { date, password: "secret" };

      // Act
      const result = redactor.redact(data);

      // Assert
      expect(result.date).toBeInstanceOf(Date);
      expect(result.password).not.toBe("secret");
    });

    it("should handle RegExp objects", () => {
      // Arrange
      const redactor = new Redactor();
      const regex = /test/;
      const data = { regex, password: "secret" };

      // Act
      const result = redactor.redact(data);

      // Assert
      expect(result.regex).toBeInstanceOf(RegExp);
      expect(result.password).not.toBe("secret");
    });

    it("should handle Error objects", () => {
      // Arrange
      const redactor = new Redactor();
      const error = new Error("Test error");
      const data = { error, password: "secret" };

      // Act
      const result = redactor.redact(data);

      // Assert
      expect(result.error).toBeDefined();
      expect(result.error.name).toBe("Error");
      expect(result.password).not.toBe("secret");
    });

    it("should handle Map objects", () => {
      // Arrange
      const redactor = new Redactor();
      const map = new Map([
        ["password", "secret"],
        ["username", "user"],
      ]);
      const data = { map };

      // Act
      const result = redactor.redact(data);

      // Assert
      expect(result.map).toBeInstanceOf(Map);
      const mapResult = result.map as Map<string, string>;
      expect(mapResult.get("password")).not.toBe("secret");
      expect(mapResult.get("username")).toBe("user");
    });

    it("should handle Set objects", () => {
      // Arrange
      const redactor = new Redactor();
      const set = new Set(["password", "secret"]);
      const data = { set };

      // Act
      const result = redactor.redact(data);

      // Assert
      expect(result.set).toBeInstanceOf(Set);
    });

    it("should handle functions", () => {
      // Arrange
      const redactor = new Redactor();
      const fn = () => "test";
      const data = { fn, password: "secret" };

      // Act
      const result = redactor.redact(data);

      // Assert
      expect(result.fn).toBe("[Function]");
      expect(result.password).not.toBe("secret");
    });

    it("should handle symbols", () => {
      // Arrange
      const redactor = new Redactor();
      const sym = Symbol("test");
      const data = { sym, password: "secret" };

      // Act
      const result = redactor.redact(data);

      // Assert
      expect(typeof result.sym).toBe("string");
      expect(result.password).not.toBe("secret");
    });
  });

  describe("redactString()", () => {
    it("should return unchanged when disabled", () => {
      // Arrange
      const redactor = new Redactor({ enabled: false });

      // Act
      const result = redactor.redactString("test");

      // Assert
      expect(result).toBe("test");
    });

    it("should return unchanged when not a string", () => {
      // Arrange
      const redactor = new Redactor();

      // Act
      const result = redactor.redactString(123 as any);

      // Assert
      expect(result).toBe(123);
    });

    it("should apply value patterns", () => {
      // Arrange
      const redactor = new Redactor();
      redactor.addValuePatterns({
        name: "test",
        pattern: /secret-\d+/,
      });

      // Act
      const result = redactor.redactString("secret-123");

      // Assert
      expect(result).not.toBe("secret-123");
    });
  });

  describe("shouldRedactField()", () => {
    it("should return false for whitelisted fields", () => {
      // Arrange
      const redactor = new Redactor();
      redactor.addFieldPatterns("password");
      redactor.addWhitelist("password");

      // Act
      const result = redactor.shouldRedactField("password");

      // Assert
      expect(result).toBe(false);
    });

    it("should return true for matching patterns", () => {
      // Arrange
      const redactor = new Redactor();
      redactor.addFieldPatterns("password");

      // Act
      const result = redactor.shouldRedactField("password");

      // Assert
      expect(result).toBe(true);
    });

    it("should be case-insensitive", () => {
      // Arrange
      const redactor = new Redactor();
      redactor.addFieldPatterns("password");

      // Act
      const result = redactor.shouldRedactField("PASSWORD");

      // Assert
      expect(result).toBe(true);
    });

    it("should match partial field names", () => {
      // Arrange
      const redactor = new Redactor();
      redactor.addFieldPatterns("pass");

      // Act
      const result = redactor.shouldRedactField("userPassword");

      // Assert
      expect(result).toBe(true);
    });
  });

  describe("partial redaction", () => {
    it("should show last N characters when partial redaction enabled", () => {
      // Arrange
      const redactor = new Redactor({
        enabled: true,
        partialRedaction: true,
        revealLastChars: 4,
        replacement: "••••",
      });

      // Act
      const result = redactor.redact({ password: "secret123456" });

      // Assert
      expect(result.password).toContain("3456");
      expect(result.password).not.toBe("secret123456");
    });

    it("should use full replacement when value shorter than reveal chars", () => {
      // Arrange
      const redactor = new Redactor({
        enabled: true,
        partialRedaction: true,
        revealLastChars: 10,
        replacement: "••••",
      });

      // Act
      const result = redactor.redact({ password: "short" });

      // Assert
      expect(result.password).toBe("••••");
    });

    it("should use pattern-specific partial redaction", () => {
      // Arrange
      const redactor = new Redactor({
        enabled: true,
        partialRedaction: false,
        replacement: "***",
      });
      redactor.addValuePatterns({
        name: "credit-card",
        pattern: /\d{16}/,
        partialRedaction: true,
        revealLastChars: 4,
      });

      // Act
      const result = redactor.redactString("4532015112830366");

      // Assert
      expect(result).toContain("0366");
      expect(result).not.toBe("4532015112830366");
    });
  });
});

