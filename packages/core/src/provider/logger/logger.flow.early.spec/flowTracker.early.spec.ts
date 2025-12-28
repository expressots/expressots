// Unit tests for: FlowTracker class and flow functions

import {
  FlowTracker,
  getDefaultFlowConfig,
  getFlowTracker,
  findFlowTracker,
  removeFlowTracker,
} from "../logger.flow";

describe("FlowTracker", () => {
  describe("Constructor", () => {
    it("should create tracker with requestId, method, and path", () => {
      // Act
      const tracker = new FlowTracker("req-123", "GET", "/api/test");

      // Assert
      expect(tracker.isEnabled()).toBeDefined();
      const flow = tracker.getFlow();
      expect(flow.requestId).toBe("req-123");
      expect(flow.method).toBe("GET");
      expect(flow.path).toBe("/api/test");
    });

    it("should use default config when not provided", () => {
      // Act
      const tracker = new FlowTracker("req-123", "GET", "/api/test");

      // Assert
      expect(tracker.isEnabled()).toBe(process.env.NODE_ENV !== "production");
    });

    it("should merge custom config with defaults", () => {
      // Act
      const tracker = new FlowTracker("req-123", "GET", "/api/test", {
        enabled: false,
      });

      // Assert
      expect(tracker.isEnabled()).toBe(false);
    });
  });

  describe("startStep()", () => {
    it("should start tracking a step when enabled", () => {
      // Arrange
      const tracker = new FlowTracker("req-123", "GET", "/api/test", {
        enabled: true,
      });

      // Act
      tracker.startStep("middleware", "auth-middleware");

      // Assert
      const flow = tracker.getFlow();
      expect(flow.steps.length).toBe(1);
      expect(flow.steps[0].name).toBe("auth-middleware");
      expect(flow.steps[0].type).toBe("middleware");
    });

    it("should not start step when disabled", () => {
      // Arrange
      const tracker = new FlowTracker("req-123", "GET", "/api/test", {
        enabled: false,
      });

      // Act
      tracker.startStep("middleware", "auth-middleware");

      // Assert
      const flow = tracker.getFlow();
      expect(flow.steps.length).toBe(0);
    });

    it("should add nested steps when trackNested is true", () => {
      // Arrange
      const tracker = new FlowTracker("req-123", "GET", "/api/test", {
        enabled: true,
        trackNested: true,
      });

      // Act
      tracker.startStep("middleware", "outer");
      tracker.startStep("guard", "inner");

      // Assert
      const flow = tracker.getFlow();
      expect(flow.steps.length).toBe(1);
      expect(flow.steps[0].children?.length).toBe(1);
    });

    it("should not add nested steps when trackNested is false", () => {
      // Arrange
      const tracker = new FlowTracker("req-123", "GET", "/api/test", {
        enabled: true,
        trackNested: false,
      });

      // Act
      tracker.startStep("middleware", "outer");
      tracker.startStep("guard", "inner");

      // Assert
      const flow = tracker.getFlow();
      expect(flow.steps.length).toBe(2);
    });

    it("should include metadata in step", () => {
      // Arrange
      const tracker = new FlowTracker("req-123", "GET", "/api/test", {
        enabled: true,
      });

      // Act
      tracker.startStep("middleware", "auth", { userId: "123" });

      // Assert
      const flow = tracker.getFlow();
      expect(flow.steps[0].metadata).toEqual({ userId: "123" });
    });
  });

  describe("endStep()", () => {
    it("should end current step with success status", () => {
      // Arrange
      const tracker = new FlowTracker("req-123", "GET", "/api/test", {
        enabled: true,
      });
      tracker.startStep("middleware", "auth");

      // Act
      tracker.endStep("success");

      // Assert
      const flow = tracker.getFlow();
      expect(flow.steps[0].status).toBe("success");
      expect(flow.steps[0].duration).toBeGreaterThanOrEqual(0);
    });

    it("should end step with failure status", () => {
      // Arrange
      const tracker = new FlowTracker("req-123", "GET", "/api/test", {
        enabled: true,
      });
      tracker.startStep("middleware", "auth");

      // Act
      tracker.endStep("failure");

      // Assert
      const flow = tracker.getFlow();
      expect(flow.steps[0].status).toBe("failure");
    });

    it("should include error in metadata when provided", () => {
      // Arrange
      const tracker = new FlowTracker("req-123", "GET", "/api/test", {
        enabled: true,
      });
      tracker.startStep("middleware", "auth", {}); // Initialize metadata
      const error = new Error("Test error");

      // Act
      tracker.endStep("failure", error);

      // Assert
      const flow = tracker.getFlow();
      expect(flow.steps[0].metadata?.error).toBeDefined();
      const errorObj = flow.steps[0].metadata?.error as { message: string };
      expect(errorObj.message).toBe("Test error");
    });

    it("should not end step when disabled", () => {
      // Arrange
      const tracker = new FlowTracker("req-123", "GET", "/api/test", {
        enabled: false,
      });

      // Act
      tracker.endStep();

      // Assert - should not throw
      expect(tracker).toBeDefined();
    });

    it("should not end step when no current step", () => {
      // Arrange
      const tracker = new FlowTracker("req-123", "GET", "/api/test", {
        enabled: true,
      });

      // Act
      tracker.endStep();

      // Assert - should not throw
      expect(tracker).toBeDefined();
    });

    it("should restore parent step from stack", () => {
      // Arrange
      const tracker = new FlowTracker("req-123", "GET", "/api/test", {
        enabled: true,
        trackNested: true,
      });
      tracker.startStep("middleware", "outer");
      tracker.startStep("guard", "inner");

      // Act
      tracker.endStep();

      // Assert
      const flow = tracker.getFlow();
      expect(flow.steps[0].name).toBe("outer");
    });
  });

  describe("skipStep()", () => {
    it("should mark current step as skipped", () => {
      // Arrange
      const tracker = new FlowTracker("req-123", "GET", "/api/test", {
        enabled: true,
      });
      tracker.startStep("middleware", "auth");

      // Act
      tracker.skipStep();

      // Assert
      const flow = tracker.getFlow();
      expect(flow.steps[0].status).toBe("skipped");
    });
  });

  describe("failStep()", () => {
    it("should mark current step as failed", () => {
      // Arrange
      const tracker = new FlowTracker("req-123", "GET", "/api/test", {
        enabled: true,
      });
      tracker.startStep("middleware", "auth");

      // Act
      tracker.failStep();

      // Assert
      const flow = tracker.getFlow();
      expect(flow.steps[0].status).toBe("failure");
    });

    it("should include error when provided", () => {
      // Arrange
      const tracker = new FlowTracker("req-123", "GET", "/api/test", {
        enabled: true,
      });
      tracker.startStep("middleware", "auth", {}); // Initialize metadata
      const error = new Error("Test error");

      // Act
      tracker.failStep(error);

      // Assert
      const flow = tracker.getFlow();
      expect(flow.steps[0].metadata?.error).toBeDefined();
    });
  });

  describe("finalize()", () => {
    it("should finalize flow with status code", () => {
      // Arrange
      const tracker = new FlowTracker("req-123", "GET", "/api/test", {
        enabled: true,
      });

      // Act
      const flow = tracker.finalize(200);

      // Assert
      expect(flow.statusCode).toBe(200);
      expect(flow.totalDuration).toBeGreaterThanOrEqual(0);
    });

    it("should finalize flow with error", () => {
      // Arrange
      const tracker = new FlowTracker("req-123", "GET", "/api/test", {
        enabled: true,
      });
      const error = new Error("Test error");

      // Act
      const flow = tracker.finalize(undefined, error);

      // Assert
      expect(flow.error).toBeDefined();
      expect(flow.error?.message).toBe("Test error");
    });

    it("should end remaining steps", () => {
      // Arrange
      const tracker = new FlowTracker("req-123", "GET", "/api/test", {
        enabled: true,
      });
      tracker.startStep("middleware", "auth");

      // Act
      const flow = tracker.finalize();

      // Assert
      expect(flow.steps[0].status).toBe("success");
    });

    it("should calculate memory delta when trackMemory is true", () => {
      // Arrange
      const tracker = new FlowTracker("req-123", "GET", "/api/test", {
        enabled: true,
        trackMemory: true,
      });

      // Act
      const flow = tracker.finalize();

      // Assert
      expect(flow.memoryDelta).toBeDefined();
    });

    it("should not calculate memory delta when trackMemory is false", () => {
      // Arrange
      const tracker = new FlowTracker("req-123", "GET", "/api/test", {
        enabled: true,
        trackMemory: false,
      });

      // Act
      const flow = tracker.finalize();

      // Assert
      expect(flow.memoryDelta).toBe(0);
    });

    it("should return flow when disabled", () => {
      // Arrange
      const tracker = new FlowTracker("req-123", "GET", "/api/test", {
        enabled: false,
      });

      // Act
      const flow = tracker.finalize();

      // Assert
      expect(flow).toBeDefined();
    });
  });

  describe("getFlow()", () => {
    it("should return current flow data", () => {
      // Arrange
      const tracker = new FlowTracker("req-123", "GET", "/api/test", {
        enabled: true,
      });
      tracker.startStep("middleware", "auth");

      // Act
      const flow = tracker.getFlow();

      // Assert
      expect(flow.steps.length).toBe(1);
    });
  });

  describe("isEnabled()", () => {
    it("should return true when enabled", () => {
      // Arrange
      const tracker = new FlowTracker("req-123", "GET", "/api/test", {
        enabled: true,
      });

      // Assert
      expect(tracker.isEnabled()).toBe(true);
    });

    it("should return false when disabled", () => {
      // Arrange
      const tracker = new FlowTracker("req-123", "GET", "/api/test", {
        enabled: false,
      });

      // Assert
      expect(tracker.isEnabled()).toBe(false);
    });
  });

  describe("shouldShowVisualization()", () => {
    it("should return false when disabled", () => {
      // Arrange
      const tracker = new FlowTracker("req-123", "GET", "/api/test", {
        enabled: false,
      });

      // Assert
      expect(tracker.shouldShowVisualization()).toBe(false);
    });

    it("should return false when showVisualization is false", () => {
      // Arrange
      const tracker = new FlowTracker("req-123", "GET", "/api/test", {
        enabled: true,
        showVisualization: false,
      });

      // Assert
      expect(tracker.shouldShowVisualization()).toBe(false);
    });

    it("should return true when enabled and showVisualization is true", () => {
      // Arrange
      const tracker = new FlowTracker("req-123", "GET", "/api/test", {
        enabled: true,
        showVisualization: true,
      });

      // Assert
      expect(tracker.shouldShowVisualization()).toBe(true);
    });

    it("should respect minDuration threshold", () => {
      // Arrange
      const tracker = new FlowTracker("req-123", "GET", "/api/test", {
        enabled: true,
        showVisualization: true,
        minDuration: 1000,
      });

      // Act
      const shouldShow = tracker.shouldShowVisualization();

      // Assert - should be false because duration < minDuration
      expect(shouldShow).toBe(false);
    });
  });
});

describe("getDefaultFlowConfig", () => {
  it("should return default config for development", () => {
    // Act
    const config = getDefaultFlowConfig();

    // Assert
    expect(config.enabled).toBe(process.env.NODE_ENV !== "production");
    expect(config.trackMemory).toBe(true);
    expect(config.trackNested).toBe(true);
  });
});

describe("getFlowTracker", () => {
  beforeEach(() => {
    // Clear any existing trackers
    removeFlowTracker("req-123");
  });

  it("should create new tracker if not exists", () => {
    // Act
    const tracker = getFlowTracker("req-123", "GET", "/api/test");

    // Assert
    expect(tracker).toBeDefined();
    expect(tracker.getFlow().requestId).toBe("req-123");
  });

  it("should return existing tracker if exists", () => {
    // Arrange
    const tracker1 = getFlowTracker("req-123", "GET", "/api/test");

    // Act
    const tracker2 = getFlowTracker("req-123", "GET", "/api/test");

    // Assert
    expect(tracker2).toBe(tracker1);
  });

  it("should accept custom config", () => {
    // Act
    const tracker = getFlowTracker("req-123", "GET", "/api/test", {
      enabled: false,
    });

    // Assert
    expect(tracker.isEnabled()).toBe(false);
  });
});

describe("findFlowTracker", () => {
  beforeEach(() => {
    removeFlowTracker("req-123");
  });

  it("should return tracker if exists", () => {
    // Arrange
    getFlowTracker("req-123", "GET", "/api/test");

    // Act
    const tracker = findFlowTracker("req-123");

    // Assert
    expect(tracker).toBeDefined();
  });

  it("should return undefined if not exists", () => {
    // Act
    const tracker = findFlowTracker("non-existent");

    // Assert
    expect(tracker).toBeUndefined();
  });
});

describe("removeFlowTracker", () => {
  it("should remove tracker", () => {
    // Arrange
    getFlowTracker("req-123", "GET", "/api/test");

    // Act
    removeFlowTracker("req-123");

    // Assert
    expect(findFlowTracker("req-123")).toBeUndefined();
  });
});
