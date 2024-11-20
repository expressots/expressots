// Unit tests for: cleanUpMetadata

import { METADATA_KEY } from "../constants";
import { cleanUpMetadata } from "../utils";
import "reflect-metadata";

describe("cleanUpMetadata() cleanUpMetadata method", () => {
  describe("Happy Path", () => {
    it("should set the controller metadata to an empty array on Reflect", () => {
      // Arrange
      Reflect.defineMetadata(METADATA_KEY.controller, ["someValue"], Reflect);

      // Act
      cleanUpMetadata();

      // Assert
      const metadata = Reflect.getMetadata(METADATA_KEY.controller, Reflect);
      expect(metadata).toEqual([]);
    });
  });

  // Edge Case Tests
  describe("Edge Cases", () => {
    it("should handle the case where no metadata is initially set", () => {
      // Arrange
      Reflect.deleteMetadata(METADATA_KEY.controller, Reflect);

      // Act
      cleanUpMetadata();

      // Assert
      const metadata = Reflect.getMetadata(METADATA_KEY.controller, Reflect);
      expect(metadata).toEqual([]);
    });

    it("should overwrite existing metadata with an empty array", () => {
      // Arrange
      Reflect.defineMetadata(METADATA_KEY.controller, ["existingValue"], Reflect);

      // Act
      cleanUpMetadata();

      // Assert
      const metadata = Reflect.getMetadata(METADATA_KEY.controller, Reflect);
      expect(metadata).toEqual([]);
    });
  });
});

// End of unit tests for: cleanUpMetadata
