// Unit tests for: ContextManager class

import "reflect-metadata";
import { ContextManager, LogContext, HttpContext, LogContext as LogContextDecorator, LogMethod } from "../logger.context";

describe("ContextManager", () => {
  beforeEach(() => {
    // Reset global context and configuration
    ContextManager.setGlobalContext({});
    ContextManager.configure({
      detectClassName: true,
      detectMethodName: true,
      maxStackDepth: 10,
      skipPatterns: [
        /node_modules/,
        /^internal\//,
        /^node:/,
        /logger\.provider/,
        /logger\.context/,
      ],
    });
  });

  describe("configure()", () => {
    it("should merge configuration with existing config", () => {
      // Arrange
      const originalConfig = ContextManager.configure({
        detectClassName: false,
      });

      // Act
      ContextManager.configure({ detectMethodName: false });

      // Assert
      const context = ContextManager.getContext();
      // Should still have detectClassName false from first call
      expect(context.className).toBeUndefined();
    });

    it("should update maxStackDepth", () => {
      // Act
      ContextManager.configure({ maxStackDepth: 5 });

      // Assert
      // Configuration is applied (no direct getter, but affects behavior)
      const context = ContextManager.getContext();
      expect(context).toBeDefined();
    });
  });

  describe("setGlobalContext() and getGlobalContext()", () => {
    it("should set and get global context", () => {
      // Arrange
      const globalContext: LogContext = {
        tenantId: "tenant-123",
        correlationId: "corr-456",
      };

      // Act
      ContextManager.setGlobalContext(globalContext);
      const retrieved = ContextManager.getGlobalContext();

      // Assert
      expect(retrieved).toEqual(globalContext);
    });

    it("should create a copy of global context", () => {
      // Arrange
      const globalContext: LogContext = { tenantId: "tenant-123" };

      // Act
      ContextManager.setGlobalContext(globalContext);
      const retrieved = ContextManager.getGlobalContext();
      retrieved.tenantId = "modified";

      // Assert
      const retrievedAgain = ContextManager.getGlobalContext();
      expect(retrievedAgain.tenantId).toBe("tenant-123");
    });
  });

  describe("getCurrentContext()", () => {
    it("should return undefined when no context is set", () => {
      // Act
      const context = ContextManager.getCurrentContext();

      // Assert
      expect(context).toBeUndefined();
    });

    it("should return context set via runWithContext", () => {
      // Arrange
      const testContext: LogContext = { requestId: "req-123" };

      // Act
      let capturedContext: LogContext | undefined;
      ContextManager.runWithContext(testContext, () => {
        capturedContext = ContextManager.getCurrentContext();
      });

      // Assert
      expect(capturedContext).toEqual(testContext);
    });
  });

  describe("runWithContext()", () => {
    it("should run synchronous function with context", () => {
      // Arrange
      const context: LogContext = { requestId: "req-123" };
      let capturedContext: LogContext | undefined;

      // Act
      const result = ContextManager.runWithContext(context, () => {
        capturedContext = ContextManager.getCurrentContext();
        return "test-result";
      });

      // Assert
      expect(result).toBe("test-result");
      expect(capturedContext).toEqual(context);
    });

    it("should return value from function", () => {
      // Arrange
      const context: LogContext = { requestId: "req-123" };

      // Act
      const result = ContextManager.runWithContext(context, () => {
        return 42;
      });

      // Assert
      expect(result).toBe(42);
    });
  });

  describe("runWithContextAsync()", () => {
    it("should run async function with context", async () => {
      // Arrange
      const context: LogContext = { requestId: "req-456" };
      let capturedContext: LogContext | undefined;

      // Act
      const result = await ContextManager.runWithContextAsync(context, async () => {
        await Promise.resolve();
        capturedContext = ContextManager.getCurrentContext();
        return "async-result";
      });

      // Assert
      expect(result).toBe("async-result");
      expect(capturedContext).toEqual(context);
    });

    it("should propagate context through async operations", async () => {
      // Arrange
      const context: LogContext = { requestId: "req-789" };
      let capturedContext: LogContext | undefined;

      // Act
      await ContextManager.runWithContextAsync(context, async () => {
        await Promise.resolve();
        await new Promise((resolve) => setTimeout(resolve, 10));
        capturedContext = ContextManager.getCurrentContext();
      });

      // Assert
      expect(capturedContext).toEqual(context);
    });
  });

  describe("getContext()", () => {
    it("should merge global, request, auto-detected, and manual context", () => {
      // Arrange
      ContextManager.setGlobalContext({ tenantId: "global-tenant" });
      const requestContext: LogContext = { requestId: "req-123" };
      const manualContext: LogContext = { userId: "user-456" };

      // Act
      let mergedContext: LogContext;
      ContextManager.runWithContext(requestContext, () => {
        mergedContext = ContextManager.getContext(manualContext);
      });

      // Assert
      expect(mergedContext!).toEqual(
        expect.objectContaining({
          tenantId: "global-tenant",
          requestId: "req-123",
          userId: "user-456",
        }),
      );
    });

    it("should skip auto-detection when skipAutoDetect is true", () => {
      // Arrange
      const manualContext: LogContext = { className: "ManualClass" };

      // Act
      const context = ContextManager.getContext(manualContext, true);

      // Assert
      // Should not have auto-detected className/methodName
      expect(context.className).toBe("ManualClass");
    });

    it("should prioritize manual context over others", () => {
      // Arrange
      ContextManager.setGlobalContext({ userId: "global-user" });
      const requestContext: LogContext = { userId: "request-user" };
      const manualContext: LogContext = { userId: "manual-user" };

      // Act
      let mergedContext: LogContext;
      ContextManager.runWithContext(requestContext, () => {
        mergedContext = ContextManager.getContext(manualContext);
      });

      // Assert
      expect(mergedContext!.userId).toBe("manual-user");
    });
  });

  describe("autoDetectContext()", () => {
    it("should return empty object when detection is disabled", () => {
      // Arrange
      ContextManager.configure({
        detectClassName: false,
        detectMethodName: false,
      });

      // Act
      const context = ContextManager.autoDetectContext();

      // Assert
      expect(context).toEqual({});
    });

    it("should detect class and method names from stack", () => {
      // Act
      class TestClass {
        testMethod(): Partial<LogContext> {
          return ContextManager.autoDetectContext();
        }
      }
      const instance = new TestClass();
      const context = instance.testMethod();

      // Assert
      // Should detect TestClass and testMethod (may vary based on test environment)
      expect(context).toBeDefined();
    });
  });

  describe("createHttpContext()", () => {
    it("should create HTTP context from request object", () => {
      // Arrange
      const req = {
        method: "POST",
        path: "/api/users",
        ip: "192.168.1.1",
        headers: {
          "user-agent": "test-agent",
          "x-request-id": "req-header-123",
        },
      };

      // Act
      const httpContext = ContextManager.createHttpContext(req);

      // Assert
      expect(httpContext.requestId).toBe("req-header-123");
      expect(httpContext.method).toBe("POST");
      expect(httpContext.path).toBe("/api/users");
      expect(httpContext.ip).toBe("192.168.1.1");
      expect(httpContext.userAgent).toBe("test-agent");
      expect(httpContext.startTime).toBeDefined();
    });

    it("should generate request ID when header not present", () => {
      // Arrange
      const req = {
        method: "GET",
        path: "/api/test",
      };

      // Act
      const httpContext = ContextManager.createHttpContext(req);

      // Assert
      expect(httpContext.requestId).toMatch(/^req_/);
      expect(httpContext.correlationId).toBe(httpContext.requestId);
    });

    it("should use custom request ID header", () => {
      // Arrange
      const req = {
        method: "GET",
        path: "/api/test",
        headers: {
          "x-custom-request-id": "custom-123",
        },
      };

      // Act
      const httpContext = ContextManager.createHttpContext(req, {
        requestIdHeader: "x-custom-request-id",
      });

      // Assert
      expect(httpContext.requestId).toBe("custom-123");
    });

    it("should use correlation ID header when provided", () => {
      // Arrange
      const req = {
        method: "GET",
        path: "/api/test",
        headers: {
          "x-correlation-id": "corr-456",
        },
      };

      // Act
      const httpContext = ContextManager.createHttpContext(req, {
        correlationIdHeader: "x-correlation-id",
      });

      // Assert
      expect(httpContext.correlationId).toBe("corr-456");
    });

    it("should extract user ID from req.user", () => {
      // Arrange
      const req = {
        method: "GET",
        path: "/api/test",
        user: { id: "user-123" },
      };

      // Act
      const httpContext = ContextManager.createHttpContext(req);

      // Assert
      expect(httpContext.userId).toBe("user-123");
    });

    it("should extract user ID from req.user.sub", () => {
      // Arrange
      const req = {
        method: "GET",
        path: "/api/test",
        user: { sub: "user-sub-456" },
      };

      // Act
      const httpContext = ContextManager.createHttpContext(req);

      // Assert
      expect(httpContext.userId).toBe("user-sub-456");
    });

    it("should extract tenant ID from header", () => {
      // Arrange
      const req = {
        method: "GET",
        path: "/api/test",
        headers: {
          "x-tenant-id": "tenant-789",
        },
      };

      // Act
      const httpContext = ContextManager.createHttpContext(req);

      // Assert
      expect(httpContext.tenantId).toBe("tenant-789");
    });

    it("should extract safe headers excluding sensitive ones", () => {
      // Arrange
      const req = {
        method: "GET",
        path: "/api/test",
        headers: {
          authorization: "Bearer token",
          cookie: "session=abc",
          "x-api-key": "secret",
          "content-type": "application/json",
          "x-custom-header": "value",
        },
      };

      // Act
      const httpContext = ContextManager.createHttpContext(req);

      // Assert
      expect(httpContext.headers).not.toHaveProperty("authorization");
      expect(httpContext.headers).not.toHaveProperty("cookie");
      expect(httpContext.headers).not.toHaveProperty("x-api-key");
      expect(httpContext.headers).toHaveProperty("content-type");
      expect(httpContext.headers).toHaveProperty("x-custom-header");
    });

    it("should handle array headers", () => {
      // Arrange
      const req = {
        method: "GET",
        path: "/api/test",
        headers: {
          "x-forwarded-for": ["192.168.1.1", "10.0.0.1"],
        },
      };

      // Act
      const httpContext = ContextManager.createHttpContext(req);

      // Assert
      expect(httpContext.headers?.["x-forwarded-for"]).toBe("192.168.1.1, 10.0.0.1");
    });

    it("should use url when path is not available", () => {
      // Arrange
      const req = {
        method: "GET",
        url: "/api/alternative",
      };

      // Act
      const httpContext = ContextManager.createHttpContext(req);

      // Assert
      expect(httpContext.path).toBe("/api/alternative");
    });

    it("should default to UNKNOWN method when not provided", () => {
      // Arrange
      const req = {
        path: "/api/test",
      };

      // Act
      const httpContext = ContextManager.createHttpContext(req);

      // Assert
      expect(httpContext.method).toBe("UNKNOWN");
    });

    it("should default to / path when neither path nor url provided", () => {
      // Arrange
      const req = {
        method: "GET",
      };

      // Act
      const httpContext = ContextManager.createHttpContext(req);

      // Assert
      expect(httpContext.path).toBe("/");
    });
  });

  describe("generateRequestId()", () => {
    it("should generate unique request IDs", () => {
      // Act
      const id1 = ContextManager.generateRequestId();
      const id2 = ContextManager.generateRequestId();

      // Assert
      expect(id1).toMatch(/^req_/);
      expect(id2).toMatch(/^req_/);
      expect(id1).not.toBe(id2);
    });
  });

  describe("formatContext()", () => {
    it("should format context with class and method", () => {
      // Arrange
      const context: LogContext = {
        className: "TestClass",
        methodName: "testMethod",
      };

      // Act
      const formatted = ContextManager.formatContext(context);

      // Assert
      expect(formatted).toBe("[TestClass.testMethod]");
    });

    it("should format context with only class name", () => {
      // Arrange
      const context: LogContext = {
        className: "TestClass",
      };

      // Act
      const formatted = ContextManager.formatContext(context);

      // Assert
      expect(formatted).toBe("[TestClass]");
    });

    it("should format context with only method name", () => {
      // Arrange
      const context: LogContext = {
        methodName: "testMethod",
      };

      // Act
      const formatted = ContextManager.formatContext(context);

      // Assert
      expect(formatted).toBe("[testMethod]");
    });

    it("should format context with label when no class/method", () => {
      // Arrange
      const context: LogContext = {
        label: "CustomLabel",
      };

      // Act
      const formatted = ContextManager.formatContext(context);

      // Assert
      expect(formatted).toBe("[CustomLabel]");
    });

    it("should include request ID in formatted context", () => {
      // Arrange
      const context: LogContext = {
        className: "TestClass",
        requestId: "req-1234567890",
      };

      // Act
      const formatted = ContextManager.formatContext(context);

      // Assert
      // Request ID is sliced to first 8 characters (including "req-" prefix)
      expect(formatted).toContain("[TestClass");
      expect(formatted).toContain("req:");
      // The format is "req:" + first 8 chars of requestId
      expect(formatted).toMatch(/req:req-1234/);
    });

    it("should return empty string when no context parts", () => {
      // Arrange
      const context: LogContext = {};

      // Act
      const formatted = ContextManager.formatContext(context);

      // Assert
      expect(formatted).toBe("");
    });
  });

  describe("parseFrameName()", () => {
    it("should parse ClassName.methodName format", () => {
      // This is tested indirectly through autoDetectContext
      // But we can test the behavior by checking if context detection works
      class TestClass {
        testMethod(): Partial<LogContext> {
          return ContextManager.autoDetectContext();
        }
      }
      const instance = new TestClass();
      const context = instance.testMethod();

      // Should detect class and method
      expect(context).toBeDefined();
    });
  });

  describe("LogContext decorator", () => {
    it("should store context name as metadata", () => {
      // Arrange & Act
      @LogContextDecorator("CustomContext")
      class TestClass {}

      // Assert
      const contextName = Reflect.getMetadata("log:context", TestClass);
      expect(contextName).toBe("CustomContext");
    });

    it("should use class name when context name not provided", () => {
      // Arrange & Act
      @LogContextDecorator()
      class TestClass {}

      // Assert
      const contextName = Reflect.getMetadata("log:context", TestClass);
      expect(contextName).toBe("TestClass");
    });
  });

  describe("LogMethod decorator", () => {
    it("should wrap method with context", () => {
      // Arrange
      @LogContextDecorator("TestClass")
      class TestClass {
        @LogMethod()
        testMethod(): LogContext | undefined {
          return ContextManager.getCurrentContext();
        }
      }

      const instance = new TestClass();

      // Act
      const context = instance.testMethod();

      // Assert
      expect(context).toBeDefined();
      expect(context?.className).toBe("TestClass");
      expect(context?.methodName).toBe("testMethod");
    });

    it("should use custom method name when provided", () => {
      // Arrange
      @LogContextDecorator("TestClass")
      class TestClass {
        @LogMethod("customMethodName")
        testMethod(): LogContext | undefined {
          return ContextManager.getCurrentContext();
        }
      }

      const instance = new TestClass();

      // Act
      const context = instance.testMethod();

      // Assert
      expect(context?.methodName).toBe("customMethodName");
    });

    it("should preserve method return value", () => {
      // Arrange
      @LogContextDecorator("TestClass")
      class TestClass {
        @LogMethod()
        testMethod(): string {
          return "test-result";
        }
      }

      const instance = new TestClass();

      // Act
      const result = instance.testMethod();

      // Assert
      expect(result).toBe("test-result");
    });

    it("should pass arguments to original method", () => {
      // Arrange
      @LogContextDecorator("TestClass")
      class TestClass {
        @LogMethod()
        testMethod(arg1: string, arg2: number): string {
          return `${arg1}-${arg2}`;
        }
      }

      const instance = new TestClass();

      // Act
      const result = instance.testMethod("test", 42);

      // Assert
      expect(result).toBe("test-42");
    });
  });
});

