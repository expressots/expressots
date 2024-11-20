// Unit tests for: instanceOfIHttpActionResult

import type { IHttpActionResult } from "../interfaces";
import { instanceOfIHttpActionResult } from "../utils";

describe("instanceOfIHttpActionResult() instanceOfIHttpActionResult method", () => {
  describe("Happy Path", () => {});

  describe("Edge Cases", () => {
    it("should return false when the object is null", () => {
      const nullValue = null;
      expect(instanceOfIHttpActionResult(nullValue)).toBe(false);
    });

    it("should return false when the object is undefined", () => {
      const undefinedValue = undefined;
      expect(instanceOfIHttpActionResult(undefinedValue)).toBe(false);
    });

    it("should return false when the object does not have an executeAsync function", () => {
      const invalidObject = {
        someOtherMethod: () => {},
      };
      expect(instanceOfIHttpActionResult(invalidObject)).toBe(false);
    });

    it("should return false when the executeAsync property is not a function", () => {
      const invalidObject = {
        executeAsync: "not a function",
      };
      expect(instanceOfIHttpActionResult(invalidObject)).toBe(false);
    });

    it("should return false for primitive types", () => {
      expect(instanceOfIHttpActionResult(42)).toBe(false);
      expect(instanceOfIHttpActionResult("string")).toBe(false);
      expect(instanceOfIHttpActionResult(true)).toBe(false);
    });

    it("should return false for an empty object", () => {
      const emptyObject = {};
      expect(instanceOfIHttpActionResult(emptyObject)).toBe(false);
    });
  });
});

// End of unit tests for: instanceOfIHttpActionResult
