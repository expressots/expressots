// Unit tests for: readAsync

import { HttpContent } from "../httpContent";

// Concrete implementation of HttpContent for testing
class ConcreteHttpContent extends HttpContent {
  private content: string | Record<string, unknown> | Record<string, unknown>[];

  constructor(content: string | Record<string, unknown> | Record<string, unknown>[]) {
    super();
    this.content = content;
  }

  public async readAsync(): Promise<string | Record<string, unknown> | Record<string, unknown>[]> {
    return this.content;
  }
}

describe("HttpContent.readAsync() readAsync method", () => {
  describe("Happy Path", () => {
    it("should return a string when content is a string", async () => {
      // Arrange
      const content = "Hello, World!";
      const httpContent = new ConcreteHttpContent(content);

      // Act
      const result = await httpContent.readAsync();

      // Assert
      expect(result).toBe(content);
    });

    it("should return an object when content is an object", async () => {
      // Arrange
      const content = { key: "value" };
      const httpContent = new ConcreteHttpContent(content);

      // Act
      const result = await httpContent.readAsync();

      // Assert
      expect(result).toEqual(content);
    });

    it("should return an array of objects when content is an array of objects", async () => {
      // Arrange
      const content = [{ key1: "value1" }, { key2: "value2" }];
      const httpContent = new ConcreteHttpContent(content);

      // Act
      const result = await httpContent.readAsync();

      // Assert
      expect(result).toEqual(content);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty string content", async () => {
      // Arrange
      const content = "";
      const httpContent = new ConcreteHttpContent(content);

      // Act
      const result = await httpContent.readAsync();

      // Assert
      expect(result).toBe(content);
    });

    it("should handle empty object content", async () => {
      // Arrange
      const content = {};
      const httpContent = new ConcreteHttpContent(content);

      // Act
      const result = await httpContent.readAsync();

      // Assert
      expect(result).toEqual(content);
    });

    it("should handle empty array content", async () => {
      // Arrange
      const content: Record<string, unknown>[] = [];
      const httpContent = new ConcreteHttpContent(content);

      // Act
      const result = await httpContent.readAsync();

      // Assert
      expect(result).toEqual(content);
    });

    it("should handle complex nested object content", async () => {
      // Arrange
      const content = { nested: { key: "value", array: [1, 2, 3] } };
      const httpContent = new ConcreteHttpContent(content);

      // Act
      const result = await httpContent.readAsync();

      // Assert
      expect(result).toEqual(content);
    });
  });
});

// End of unit tests for: readAsync
