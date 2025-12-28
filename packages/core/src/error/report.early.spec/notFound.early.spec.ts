// Unit tests for: Report.notFound

import { Report } from "../report";
import { AppError, StatusCode } from "../index";

describe("Report.notFound() notFound method", () => {
  let report: Report;

  beforeEach(() => {
    report = new Report();
  });

  describe("Happy Path", () => {
    it("should create a NotFound error with resource name", () => {
      // Arrange
      const resource = "User";

      // Act
      const result = report.notFound(resource);

      // Assert
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toContain(resource);
      expect(result.statusCode).toBe(StatusCode.NotFound);
    });

    it("should create a NotFound error with resource name and id", () => {
      // Arrange
      const resource = "User";
      const id = "123";

      // Act
      const result = report.notFound(resource, id);

      // Assert
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toContain(resource);
      expect(result.message).toContain(id);
      expect(result.statusCode).toBe(StatusCode.NotFound);
    });
  });
});

// End of unit tests for: Report.notFound

