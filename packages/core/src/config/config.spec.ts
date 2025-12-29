/**
 * Configuration Module Tests
 *
 * @module config
 *
 * Comprehensive tests for the Enhanced Configuration system.
 */

import { defineConfig, Env } from "./define-config";
import { createSecretValue, isSecretValue } from "./secret-value";

describe("Enhanced Configuration Module", () => {
  // Store original env
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset environment for each test
    process.env = { ...originalEnv };
    process.env.NODE_ENV = "test";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ==========================================================================
  // Field Builders
  // ==========================================================================

  describe("Env Field Builders", () => {
    describe("Env.string()", () => {
      it("should create a string field with default", () => {
        const config = defineConfig({
          host: Env.string("HOST", { default: "localhost" }),
        });

        expect(config.values.host).toBe("localhost");
      });

      it("should read from environment variable", () => {
        process.env.HOST = "example.com";

        const config = defineConfig({
          host: Env.string("HOST", { default: "localhost" }),
        });

        expect(config.values.host).toBe("example.com");
      });

      it("should trim whitespace by default", () => {
        process.env.HOST = "  example.com  ";

        const config = defineConfig({
          host: Env.string("HOST"),
        });

        expect(config.values.host).toBe("example.com");
      });

      it("should validate minLength", () => {
        process.env.API_KEY = "abc";

        const config = defineConfig(
          {
            key: Env.string("API_KEY", { minLength: 10 }),
          },
          { throwOnError: false, logLevel: "none" },
        );

        expect(config.isValid()).toBe(false);
        expect(config.getErrors()[0].code).toBe("INVALID_FORMAT");
      });

      it("should validate email format", () => {
        process.env.EMAIL = "not-an-email";

        const config = defineConfig(
          {
            email: Env.string("EMAIL", { format: "email" }),
          },
          { throwOnError: false, logLevel: "none" },
        );

        expect(config.isValid()).toBe(false);
        expect(config.getErrors()[0].code).toBe("INVALID_FORMAT");
      });

      it("should accept valid email format", () => {
        process.env.EMAIL = "user@example.com";

        const config = defineConfig({
          email: Env.string("EMAIL", { format: "email" }),
        });

        expect(config.isValid()).toBe(true);
        expect(config.values.email).toBe("user@example.com");
      });

      it("should apply lowercase transform", () => {
        process.env.NAME = "UPPERCASE";

        const config = defineConfig({
          name: Env.string("NAME", { lowercase: true }),
        });

        expect(config.values.name).toBe("uppercase");
      });
    });

    describe("Env.number()", () => {
      it("should create a number field with default", () => {
        const config = defineConfig({
          port: Env.number("PORT", { default: 3000 }),
        });

        expect(config.values.port).toBe(3000);
      });

      it("should parse number from environment", () => {
        process.env.PORT = "8080";

        const config = defineConfig({
          port: Env.number("PORT", { default: 3000 }),
        });

        expect(config.values.port).toBe(8080);
      });

      it("should validate min/max range", () => {
        process.env.COUNT = "150";

        const config = defineConfig(
          {
            count: Env.number("COUNT", { min: 1, max: 100 }),
          },
          { throwOnError: false, logLevel: "none" },
        );

        expect(config.isValid()).toBe(false);
        expect(config.getErrors()[0].code).toBe("OUT_OF_RANGE");
      });

      it("should validate integer requirement", () => {
        process.env.COUNT = "3.14";

        const config = defineConfig(
          {
            count: Env.number("COUNT", { integer: true }),
          },
          { throwOnError: false, logLevel: "none" },
        );

        expect(config.isValid()).toBe(false);
        expect(config.getErrors()[0].code).toBe("INVALID_TYPE");
      });

      it("should error on invalid number", () => {
        process.env.COUNT = "not-a-number";

        const config = defineConfig(
          {
            count: Env.number("COUNT"),
          },
          { throwOnError: false, logLevel: "none" },
        );

        expect(config.isValid()).toBe(false);
        expect(config.getErrors()[0].code).toBe("INVALID_TYPE");
      });
    });

    describe("Env.boolean()", () => {
      it("should create a boolean field with default", () => {
        const config = defineConfig({
          debug: Env.boolean("DEBUG", { default: false }),
        });

        expect(config.values.debug).toBe(false);
      });

      it("should parse true values", () => {
        const trueValues = ["true", "1", "yes", "on"];

        for (const val of trueValues) {
          process.env.DEBUG = val;

          const config = defineConfig({
            debug: Env.boolean("DEBUG"),
          });

          expect(config.values.debug).toBe(true);
        }
      });

      it("should parse false values", () => {
        const falseValues = ["false", "0", "no", "off"];

        for (const val of falseValues) {
          process.env.DEBUG = val;

          const config = defineConfig({
            debug: Env.boolean("DEBUG"),
          });

          expect(config.values.debug).toBe(false);
        }
      });

      it("should error on invalid boolean", () => {
        process.env.DEBUG = "maybe";

        const config = defineConfig(
          {
            debug: Env.boolean("DEBUG"),
          },
          { throwOnError: false, logLevel: "none" },
        );

        expect(config.isValid()).toBe(false);
        expect(config.getErrors()[0].code).toBe("INVALID_TYPE");
      });
    });

    describe("Env.enum()", () => {
      it("should create an enum field", () => {
        process.env.LOG_LEVEL = "info";

        const config = defineConfig({
          logLevel: Env.enum("LOG_LEVEL", ["debug", "info", "warn", "error"]),
        });

        expect(config.values.logLevel).toBe("info");
      });

      it("should use default value", () => {
        const config = defineConfig({
          logLevel: Env.enum("LOG_LEVEL", ["debug", "info", "warn", "error"], {
            default: "warn",
          }),
        });

        expect(config.values.logLevel).toBe("warn");
      });

      it("should error on invalid enum value", () => {
        process.env.LOG_LEVEL = "invalid";

        const config = defineConfig(
          {
            logLevel: Env.enum("LOG_LEVEL", ["debug", "info", "warn", "error"]),
          },
          { throwOnError: false, logLevel: "none" },
        );

        expect(config.isValid()).toBe(false);
        expect(config.getErrors()[0].code).toBe("INVALID_ENUM");
      });

      it("should support case-insensitive matching", () => {
        process.env.LOG_LEVEL = "INFO";

        const config = defineConfig({
          logLevel: Env.enum("LOG_LEVEL", ["debug", "info", "warn", "error"], {
            caseInsensitive: true,
          }),
        });

        expect(config.values.logLevel).toBe("info");
      });
    });

    describe("Env.url()", () => {
      it("should validate URL format", () => {
        process.env.API_URL = "https://api.example.com";

        const config = defineConfig({
          apiUrl: Env.url("API_URL"),
        });

        expect(config.values.apiUrl).toBe("https://api.example.com");
      });

      it("should error on invalid URL", () => {
        process.env.API_URL = "not-a-url";

        const config = defineConfig(
          {
            apiUrl: Env.url("API_URL"),
          },
          { throwOnError: false, logLevel: "none" },
        );

        expect(config.isValid()).toBe(false);
        expect(config.getErrors()[0].code).toBe("INVALID_FORMAT");
      });

      it("should validate protocol", () => {
        process.env.API_URL = "http://api.example.com";

        const config = defineConfig(
          {
            apiUrl: Env.url("API_URL", { protocols: ["https"] }),
          },
          { throwOnError: false, logLevel: "none" },
        );

        expect(config.isValid()).toBe(false);
      });

      it("should remove trailing slash when configured", () => {
        process.env.API_URL = "https://api.example.com/";

        const config = defineConfig({
          apiUrl: Env.url("API_URL", { noTrailingSlash: true }),
        });

        expect(config.values.apiUrl).toBe("https://api.example.com");
      });
    });

    describe("Env.port()", () => {
      it("should validate port range", () => {
        process.env.PORT = "99999";

        const config = defineConfig(
          {
            port: Env.port("PORT"),
          },
          { throwOnError: false, logLevel: "none" },
        );

        expect(config.isValid()).toBe(false);
        expect(config.getErrors()[0].code).toBe("OUT_OF_RANGE");
      });

      it("should reject privileged ports when configured", () => {
        process.env.PORT = "80";

        const config = defineConfig(
          {
            port: Env.port("PORT", { noPrivileged: true }),
          },
          { throwOnError: false, logLevel: "none" },
        );

        expect(config.isValid()).toBe(false);
      });

      it("should accept valid port", () => {
        process.env.PORT = "8080";

        const config = defineConfig({
          port: Env.port("PORT"),
        });

        expect(config.values.port).toBe(8080);
      });
    });

    describe("Env.secret()", () => {
      it("should create a secret field", () => {
        process.env.JWT_SECRET = "super-secret-key-12345";

        const config = defineConfig({
          secret: Env.secret("JWT_SECRET"),
        });

        // Value is wrapped in SecretValue
        expect(isSecretValue(config.values.secret)).toBe(true);
        expect(config.values.secret.value).toBe("super-secret-key-12345");
      });

      it("should redact in toString()", () => {
        process.env.JWT_SECRET = "super-secret-key-12345";
        process.env.NODE_ENV = "production";

        const secret = createSecretValue("super-secret-key-12345");

        expect(secret.toString()).toBe("[REDACTED]");
        expect(secret.toJSON()).toBe("[REDACTED]");
      });

      it("should validate minLength for secrets", () => {
        process.env.JWT_SECRET = "short";

        const config = defineConfig(
          {
            secret: Env.secret("JWT_SECRET", { minLength: 32 }),
          },
          { throwOnError: false, logLevel: "none" },
        );

        expect(config.isValid()).toBe(false);
        // Error should NOT reveal the actual value
        expect(config.getErrors()[0].received).toContain("REDACTED");
      });

      it("should support equals comparison", () => {
        const secret = createSecretValue("test-secret");

        expect(secret.equals("test-secret")).toBe(true);
        expect(secret.equals("wrong-secret")).toBe(false);
      });
    });

    describe("Env.json()", () => {
      it("should parse JSON from environment", () => {
        process.env.DB_CONFIG = '{"host":"localhost","port":5432}';

        const config = defineConfig({
          dbConfig: Env.json<{ host: string; port: number }>("DB_CONFIG"),
        });

        expect(config.values.dbConfig).toEqual({
          host: "localhost",
          port: 5432,
        });
      });

      it("should error on invalid JSON", () => {
        process.env.DB_CONFIG = "not-json";

        const config = defineConfig(
          {
            dbConfig: Env.json("DB_CONFIG"),
          },
          { throwOnError: false, logLevel: "none" },
        );

        expect(config.isValid()).toBe(false);
        expect(config.getErrors()[0].code).toBe("INVALID_FORMAT");
      });

      it("should support custom validation", () => {
        process.env.ITEMS = '["a", "b"]';

        const config = defineConfig(
          {
            items: Env.json<Array<string>>("ITEMS", {
              validate: (v) => Array.isArray(v) || "Must be an array",
            }),
          },
          { throwOnError: false, logLevel: "none" },
        );

        expect(config.isValid()).toBe(true);
      });
    });

    describe("Env.array()", () => {
      it("should parse comma-separated array", () => {
        process.env.HOSTS = "host1,host2,host3";

        const config = defineConfig({
          hosts: Env.array("HOSTS"),
        });

        expect(config.values.hosts).toEqual(["host1", "host2", "host3"]);
      });

      it("should support custom delimiter", () => {
        process.env.HOSTS = "host1|host2|host3";

        const config = defineConfig({
          hosts: Env.array("HOSTS", { delimiter: "|" }),
        });

        expect(config.values.hosts).toEqual(["host1", "host2", "host3"]);
      });

      it("should parse number array", () => {
        process.env.DELAYS = "100,500,1000";

        const config = defineConfig({
          delays: Env.array("DELAYS", { itemType: "number" }),
        });

        expect(config.values.delays).toEqual([100, 500, 1000]);
      });

      it("should remove duplicates when configured", () => {
        process.env.HOSTS = "host1,host2,host1";

        const config = defineConfig({
          hosts: Env.array("HOSTS", { unique: true }),
        });

        expect(config.values.hosts).toEqual(["host1", "host2"]);
      });
    });
  });

  // ==========================================================================
  // Nested Configuration
  // ==========================================================================

  describe("Nested Configuration", () => {
    it("should support nested config objects", () => {
      process.env.DB_HOST = "localhost";
      process.env.DB_PORT = "5432";
      process.env.REDIS_URL = "redis://localhost:6379";

      const config = defineConfig({
        database: {
          host: Env.string("DB_HOST"),
          port: Env.port("DB_PORT"),
        },
        redis: {
          url: Env.url("REDIS_URL"),
        },
      });

      expect(config.values.database.host).toBe("localhost");
      expect(config.values.database.port).toBe(5432);
      expect(config.values.redis.url).toBe("redis://localhost:6379");
    });

    it("should report nested paths in errors", () => {
      const config = defineConfig(
        {
          database: {
            host: Env.string("DB_HOST", { required: true }),
          },
        },
        { throwOnError: false, logLevel: "none" },
      );

      expect(config.getErrors()[0].path).toBe("database.host");
    });
  });

  // ==========================================================================
  // Multi-Environment Defaults
  // ==========================================================================

  describe("Multi-Environment Defaults", () => {
    it("should use environment-specific default", () => {
      process.env.NODE_ENV = "development";

      const config = defineConfig({
        host: Env.string("HOST", {
          development: "localhost",
          production: "prod.example.com",
        }),
      });

      expect(config.values.host).toBe("localhost");
    });

    it("should use production default in production", () => {
      process.env.NODE_ENV = "production";

      const config = defineConfig({
        host: Env.string("HOST", {
          development: "localhost",
          production: "prod.example.com",
        }),
      });

      expect(config.values.host).toBe("prod.example.com");
    });

    it("should fall back to general default", () => {
      process.env.NODE_ENV = "staging";

      const config = defineConfig({
        host: Env.string("HOST", {
          default: "default.example.com",
          development: "localhost",
          production: "prod.example.com",
        }),
      });

      expect(config.values.host).toBe("default.example.com");
    });
  });

  // ==========================================================================
  // Validation
  // ==========================================================================

  describe("Validation", () => {
    it("should validate required fields", () => {
      const config = defineConfig(
        {
          apiKey: Env.string("API_KEY", { required: true }),
        },
        { throwOnError: false, logLevel: "none" },
      );

      expect(config.isValid()).toBe(false);
      expect(config.getErrors()).toHaveLength(1);
      expect(config.getErrors()[0].code).toBe("MISSING");
    });

    it("should include helpful hints in errors", () => {
      const config = defineConfig(
        {
          apiKey: Env.string("API_KEY", {
            required: true,
            hint: "Get your API key from the dashboard",
          }),
        },
        { throwOnError: false, logLevel: "none" },
      );

      expect(config.getErrors()[0].hint).toBe(
        "Get your API key from the dashboard",
      );
    });

    it("should throw on error when configured", () => {
      expect(() => {
        const config = defineConfig(
          {
            apiKey: Env.string("API_KEY", { required: true }),
          },
          { throwOnError: true, logLevel: "none" },
        );
        // Accessing values triggers validation and throw
        const _ = config.values;
      }).toThrow();
    });

    it("should report deprecation warnings", () => {
      process.env.OLD_KEY = "value";

      const config = defineConfig(
        {
          oldKey: Env.string("OLD_KEY", {
            deprecated: "Use NEW_KEY instead",
          }),
        },
        { logLevel: "none" },
      );

      const result = config.validate();
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain("Use NEW_KEY instead");
    });
  });

  // ==========================================================================
  // Config Instance Methods
  // ==========================================================================

  describe("Config Instance Methods", () => {
    it("should get value by path", () => {
      process.env.DB_HOST = "localhost";

      const config = defineConfig({
        database: {
          host: Env.string("DB_HOST"),
        },
      });

      expect(config.get("database.host")).toBe("localhost");
    });

    it("should check if value exists", () => {
      process.env.DB_HOST = "localhost";

      const config = defineConfig({
        database: {
          host: Env.string("DB_HOST"),
          port: Env.port("DB_PORT"),
        },
      });

      expect(config.has("database.host")).toBe(true);
      expect(config.has("database.port")).toBe(false);
    });

    it("should return all env vars", () => {
      const config = defineConfig({
        host: Env.string("HOST"),
        port: Env.port("PORT"),
      });

      expect(config.getEnvVars()).toEqual(["HOST", "PORT"]);
    });

    it("should redact secrets in toObject()", () => {
      process.env.API_KEY = "secret-key";

      const config = defineConfig({
        apiKey: Env.secret("API_KEY"),
      });

      const obj = config.toObject();
      expect(obj.apiKey).toBe("[REDACTED]");
    });

    it("should generate markdown documentation", () => {
      const config = defineConfig({
        server: {
          port: Env.port("PORT", {
            default: 3000,
            description: "Server port",
          }),
        },
      });

      const docs = config.generateDocs("markdown");

      expect(docs).toContain("# Configuration Reference");
      expect(docs).toContain("PORT");
      expect(docs).toContain("Server port");
    });

    it("should generate JSON documentation", () => {
      const config = defineConfig({
        port: Env.port("PORT", { default: 3000 }),
      });

      const docs = config.generateDocs("json");
      const parsed = JSON.parse(docs);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].envVar).toBe("PORT");
    });
  });

  // ==========================================================================
  // Secret Value
  // ==========================================================================

  describe("SecretValue", () => {
    it("should reveal partial in development", () => {
      process.env.NODE_ENV = "development";

      const secret = createSecretValue("super-secret-key-12345", {
        revealStart: 0,
        revealEnd: 4,
        allowPartialReveal: true,
      });

      expect(secret.reveal()).toBe("...2345");
    });

    it("should check isSet", () => {
      const setSecret = createSecretValue("value");
      const emptySecret = createSecretValue("");

      expect(setSecret.isSet).toBe(true);
      expect(emptySecret.isSet).toBe(false);
    });

    it("should report length", () => {
      const secret = createSecretValue("12345678");

      expect(secret.length).toBe(8);
    });
  });

  // ==========================================================================
  // Options
  // ==========================================================================

  describe("DefineConfig Options", () => {
    it("should support envPrefix", () => {
      process.env.APP_PORT = "9000";

      const config = defineConfig(
        {
          port: Env.port("PORT", { default: 3000 }),
        },
        { envPrefix: "APP_" },
      );

      expect(config.values.port).toBe(9000);
    });

    it("should support custom getEnv", () => {
      const customEnv: Record<string, string> = {
        PORT: "5000",
      };

      const config = defineConfig(
        {
          port: Env.port("PORT", { default: 3000 }),
        },
        {
          getEnv: (key) => customEnv[key],
        },
      );

      expect(config.values.port).toBe(5000);
    });

    it("should reload configuration", () => {
      process.env.PORT = "3000";

      const config = defineConfig({
        port: Env.port("PORT"),
      });

      expect(config.values.port).toBe(3000);

      // Change env and reload
      process.env.PORT = "8080";
      config.reload();

      expect(config.values.port).toBe(8080);
    });

    it("should call onConfigChange callback when reloading", () => {
      process.env.PORT = "3000";
      const changeHandler = jest.fn();

      const config = defineConfig(
        {
          port: Env.port("PORT"),
        },
        { onConfigChange: changeHandler },
      );

      // Access values to initialize
      expect(config.values.port).toBe(3000);

      // Change and reload
      process.env.PORT = "8080";
      config.reload();

      // Callback should have been called with changes
      expect(changeHandler).toHaveBeenCalled();
      const call = changeHandler.mock.calls[0][0];
      expect(call.changes).toBeDefined();
      expect(call.timestamp).toBeInstanceOf(Date);
    });
  });

  // ==========================================================================
  // Additional Field Builder Tests
  // ==========================================================================

  describe("Additional Field Builders", () => {
    describe("Env.string() advanced", () => {
      it("should validate maxLength", () => {
        process.env.NAME = "This is a very long string that exceeds the limit";

        const config = defineConfig(
          {
            name: Env.string("NAME", { maxLength: 10 }),
          },
          { throwOnError: false, logLevel: "none" },
        );

        expect(config.isValid()).toBe(false);
      });

      it("should validate pattern", () => {
        process.env.CODE = "invalid!code";

        const config = defineConfig(
          {
            code: Env.string("CODE", { pattern: /^[a-z]+$/ }),
          },
          { throwOnError: false, logLevel: "none" },
        );

        expect(config.isValid()).toBe(false);
      });

      it("should apply uppercase transform", () => {
        process.env.NAME = "lowercase";

        const config = defineConfig({
          name: Env.string("NAME", { uppercase: true }),
        });

        expect(config.values.name).toBe("LOWERCASE");
      });

      it("should validate url format", () => {
        process.env.URL = "https://example.com";

        const config = defineConfig({
          url: Env.string("URL", { format: "url" }),
        });

        expect(config.isValid()).toBe(true);
      });

      it("should validate uuid format", () => {
        process.env.UUID = "550e8400-e29b-41d4-a716-446655440000";

        const config = defineConfig({
          uuid: Env.string("UUID", { format: "uuid" }),
        });

        expect(config.isValid()).toBe(true);
      });
    });

    describe("Env.number() advanced", () => {
      it("should validate positive requirement", () => {
        process.env.COUNT = "-5";

        const config = defineConfig(
          {
            count: Env.number("COUNT", { positive: true }),
          },
          { throwOnError: false, logLevel: "none" },
        );

        expect(config.isValid()).toBe(false);
      });

      it("should accept Infinity as valid number", () => {
        process.env.COUNT = "Infinity";

        const config = defineConfig({
          count: Env.number("COUNT"),
        });

        // Infinity is parsed as a valid number
        expect(config.values.count).toBe(Infinity);
      });
    });

    describe("Env.array() advanced", () => {
      it("should parse array with spaces", () => {
        process.env.ITEMS = "a, b, c";

        const config = defineConfig({
          items: Env.array("ITEMS"),
        });

        // Array items are trimmed
        expect(config.values.items).toHaveLength(3);
      });

      it("should handle single item", () => {
        process.env.ITEMS = "single";

        const config = defineConfig({
          items: Env.array("ITEMS"),
        });

        expect(config.values.items).toEqual(["single"]);
      });
    });

    describe("Env.json() advanced", () => {
      it("should use default value", () => {
        const defaultValue = { key: "value" };

        const config = defineConfig({
          data: Env.json("JSON_DATA", { default: defaultValue }),
        });

        expect(config.values.data).toEqual(defaultValue);
      });

      it("should validate with custom validator returning error string", () => {
        process.env.DATA = '{"count": -5}';

        const config = defineConfig(
          {
            data: Env.json<{ count: number }>("DATA", {
              validate: (v) => (v.count > 0 ? true : "Count must be positive"),
            }),
          },
          { throwOnError: false, logLevel: "none" },
        );

        expect(config.isValid()).toBe(false);
      });
    });

    describe("Env.url() advanced", () => {
      it("should accept valid URL with path", () => {
        process.env.API_URL = "https://api.example.com/v1/endpoint";

        const config = defineConfig({
          apiUrl: Env.url("API_URL"),
        });

        expect(config.isValid()).toBe(true);
        expect(config.values.apiUrl).toBe("https://api.example.com/v1/endpoint");
      });
    });
  });

  // ==========================================================================
  // Additional SecretValue Tests
  // ==========================================================================

  describe("SecretValue Advanced", () => {
    it("should handle timing-safe equals for different lengths", () => {
      const secret = createSecretValue("short");

      expect(secret.equals("much longer string")).toBe(false);
    });

    it("should return false for empty comparison", () => {
      const secret = createSecretValue("value");

      expect(secret.equals("")).toBe(false);
    });

    it("should return [NOT SET] for empty secret", () => {
      const secret = createSecretValue("");

      expect(secret.toString()).toBe("[NOT SET]");
    });

    it("should handle reveal with very short secret", () => {
      process.env.NODE_ENV = "development";

      const secret = createSecretValue("ab", {
        revealStart: 1,
        revealEnd: 1,
        allowPartialReveal: true,
      });

      // Too short to reveal meaningfully
      expect(secret.reveal()).toBe("[REDACTED]");
    });

    it("should use custom inspect method", () => {
      process.env.NODE_ENV = "production";

      const secret = createSecretValue("my-secret-value");
      const inspectSymbol = Symbol.for("nodejs.util.inspect.custom");

      expect((secret as any)[inspectSymbol]()).toBe("[REDACTED]");
    });
  });

  // ==========================================================================
  // Config Instance Methods Extended
  // ==========================================================================

  describe("Config Instance Extended", () => {
    it("should return undefined for non-existent nested path", () => {
      const config = defineConfig({
        server: {
          port: Env.port("PORT", { default: 3000 }),
        },
      });

      expect(config.get("server.missing.deep.path")).toBeUndefined();
    });

    it("should handle null in path traversal", () => {
      const config = defineConfig({
        value: Env.string("VALUE", { default: "test" }),
      });

      expect(config.get("nonexistent.path")).toBeUndefined();
    });

    it("should return toJSON string", () => {
      process.env.PORT = "3000";

      const config = defineConfig({
        port: Env.port("PORT"),
      });

      const json = config.toJSON();
      expect(typeof json).toBe("string");

      const parsed = JSON.parse(json);
      expect(parsed.port).toBe(3000);
    });

    it("should redact nested secrets in toObject", () => {
      process.env.SECRET_KEY = "my-secret";

      const config = defineConfig({
        auth: {
          key: Env.secret("SECRET_KEY"),
        },
      });

      const obj = config.toObject();
      expect(obj.auth).toBeDefined();
      expect((obj.auth as any).key).toBe("[REDACTED]");
    });
  });

  // ==========================================================================
  // Validation Edge Cases
  // ==========================================================================

  describe("Validation Edge Cases", () => {
    it("should handle empty schema", () => {
      const config = defineConfig({});

      expect(config.isValid()).toBe(true);
      expect(config.getErrors()).toHaveLength(0);
    });

    it("should handle deeply nested configuration", () => {
      process.env.DEEP_VALUE = "test";

      const config = defineConfig({
        level1: {
          level2: {
            level3: {
              value: Env.string("DEEP_VALUE"),
            },
          },
        },
      });

      expect(config.values.level1.level2.level3.value).toBe("test");
    });

    it("should report multiple errors", () => {
      const config = defineConfig(
        {
          required1: Env.string("REQUIRED_1", { required: true }),
          required2: Env.string("REQUIRED_2", { required: true }),
          required3: Env.string("REQUIRED_3", { required: true }),
        },
        { throwOnError: false, logLevel: "none" },
      );

      expect(config.isValid()).toBe(false);
      expect(config.getErrors().length).toBeGreaterThanOrEqual(3);
    });
  });

  // ==========================================================================
  // Documentation Generation Extended
  // ==========================================================================

  describe("Documentation Generation Extended", () => {
    it("should include deprecated fields in markdown", () => {
      process.env.OLD_VAR = "value";

      const config = defineConfig({
        oldVar: Env.string("OLD_VAR", {
          deprecated: "Use NEW_VAR instead",
          description: "Old variable",
        }),
      });

      const docs = config.generateDocs("markdown");

      expect(docs).toContain("OLD_VAR");
      expect(docs).toContain("Deprecated");
    });

    it("should include secret indicator in markdown", () => {
      process.env.SECRET = "value";

      const config = defineConfig({
        secret: Env.secret("SECRET"),
      });

      const docs = config.generateDocs("markdown");

      expect(docs).toContain("Secret");
    });

    it("should include default in markdown", () => {
      const config = defineConfig({
        port: Env.port("PORT", {
          default: 3000,
        }),
      });

      const docs = config.generateDocs("markdown");

      expect(docs).toContain("Default");
      expect(docs).toContain("3000");
    });
  });
});
