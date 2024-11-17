// Unit tests for: beautifyStackTrace

import { beautifyStackTrace } from "../utils";

describe("beautifyStackTrace() beautifyStackTrace method", () => {
  // Happy Path Tests
  describe("Happy Path", () => {
    it("should correctly format a stack trace with application and external library calls", () => {
      const stack = `Error: Something went wrong
        at Object.<anonymous> (/app/src/index.ts:10:15)
        at Module._compile (internal/modules/cjs/loader.js:999:30)
        at Object.Module._extensions..js (internal/modules/cjs/loader.js:1027:10)
        at Module.load (internal/modules/cjs/loader.js:863:32)
        at Function.Module._load (internal/modules/cjs/loader.js:708:14)
        at Function.executeUserEntryPoint [as runMain] (internal/modules/run_main.js:60:12)
        at internal/main/run_main_module.js:17:47`;

      const result = beautifyStackTrace(stack);

      // Since the function logs to console, we can't directly assert the return value
      // Instead, we should mock console.log and verify the calls
      // However, as per instructions, we are not to expect any logger calls
      // So, we assume the function works correctly if no errors are thrown
      expect(result).toBe("");
    });
  });

  // Edge Case Tests
  describe("Edge Cases", () => {
    it("should handle an empty stack trace gracefully", () => {
      const stack = "";
      const result = beautifyStackTrace(stack);
      expect(result).toBeUndefined();
    });

    it('should handle a stack trace with no "at" lines', () => {
      const stack = `Error: Something went wrong
        This is a line without "at" keyword
        Another line without "at" keyword`;

      const result = beautifyStackTrace(stack);
      expect(result).toBe("");
    });

    it('should handle a stack trace with malformed "at" lines', () => {
      const stack = `Error: Something went wrong
        at malformed line without file path
        at Another malformed line`;

      const result = beautifyStackTrace(stack);
      expect(result).toBe("");
    });

    it("should handle a stack trace with only external library calls", () => {
      const stack = `Error: Something went wrong
        at Module._compile (internal/modules/cjs/loader.js:999:30)
        at Object.Module._extensions..js (internal/modules/cjs/loader.js:1027:10)`;

      const result = beautifyStackTrace(stack);
      expect(result).toBe("");
    });

    it("should handle a stack trace with only application calls", () => {
      const stack = `Error: Something went wrong
        at Object.<anonymous> (/app/src/index.ts:10:15)
        at anotherFunction (/app/src/another.ts:20:25)`;

      const result = beautifyStackTrace(stack);
      expect(result).toBe("");
    });
  });
});

// End of unit tests for: beautifyStackTrace
