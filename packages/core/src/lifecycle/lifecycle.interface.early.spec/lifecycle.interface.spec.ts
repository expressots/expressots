/**
 * Tests for Lifecycle Interfaces and Type Guards
 */

import { IBootstrap, IShutdown, isBootstrap, isShutdown } from "../lifecycle.interface";

describe("Lifecycle Interfaces", () => {
  describe("isBootstrap", () => {
    it("should return true for objects with bootstrap method", () => {
      const obj: IBootstrap = {
        bootstrap: () => {},
      };
      expect(isBootstrap(obj)).toBe(true);
    });

    it("should return true for objects with async bootstrap method", () => {
      const obj: IBootstrap = {
        bootstrap: async () => {},
      };
      expect(isBootstrap(obj)).toBe(true);
    });

    it("should return false for objects without bootstrap method", () => {
      const obj = {
        shutdown: () => {},
      };
      expect(isBootstrap(obj)).toBe(false);
    });

    it("should return false for null", () => {
      expect(isBootstrap(null)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(isBootstrap(undefined)).toBe(false);
    });

    it("should return false for non-objects", () => {
      expect(isBootstrap("string")).toBe(false);
      expect(isBootstrap(123)).toBe(false);
      expect(isBootstrap(true)).toBe(false);
    });

    it("should return false if bootstrap is not a function", () => {
      const obj = {
        bootstrap: "not a function",
      };
      expect(isBootstrap(obj)).toBe(false);
    });
  });

  describe("isShutdown", () => {
    it("should return true for objects with shutdown method", () => {
      const obj: IShutdown = {
        shutdown: () => {},
      };
      expect(isShutdown(obj)).toBe(true);
    });

    it("should return true for objects with async shutdown method", () => {
      const obj: IShutdown = {
        shutdown: async () => {},
      };
      expect(isShutdown(obj)).toBe(true);
    });

    it("should return true for objects with shutdown accepting signal", () => {
      const obj: IShutdown = {
        shutdown: (signal?: NodeJS.Signals) => {
          console.log(signal);
        },
      };
      expect(isShutdown(obj)).toBe(true);
    });

    it("should return false for objects without shutdown method", () => {
      const obj = {
        bootstrap: () => {},
      };
      expect(isShutdown(obj)).toBe(false);
    });

    it("should return false for null", () => {
      expect(isShutdown(null)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(isShutdown(undefined)).toBe(false);
    });

    it("should return false for non-objects", () => {
      expect(isShutdown("string")).toBe(false);
      expect(isShutdown(123)).toBe(false);
      expect(isShutdown(true)).toBe(false);
    });

    it("should return false if shutdown is not a function", () => {
      const obj = {
        shutdown: "not a function",
      };
      expect(isShutdown(obj)).toBe(false);
    });
  });

  describe("Combined interfaces", () => {
    it("should support objects implementing both interfaces", () => {
      const obj: IBootstrap & IShutdown = {
        bootstrap: () => {},
        shutdown: () => {},
      };

      expect(isBootstrap(obj)).toBe(true);
      expect(isShutdown(obj)).toBe(true);
    });

    it("should work with class instances", () => {
      class FullLifecycleService implements IBootstrap, IShutdown {
        bootstrap(): void {}
        shutdown(signal?: NodeJS.Signals): void {
          console.log(`Shutting down: ${signal}`);
        }
      }

      const instance = new FullLifecycleService();
      expect(isBootstrap(instance)).toBe(true);
      expect(isShutdown(instance)).toBe(true);
    });
  });
});

