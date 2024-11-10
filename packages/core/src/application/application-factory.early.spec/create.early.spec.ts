// Unit tests for: create

import { Application } from "express";
import {
  IWebServer,
  IWebServerConstructor,
  IWebServerPublic,
} from "../../../../../node_modules/@expressots/adapter-express";
import { AppFactory } from "../application-factory";


// Mock classes and interfaces
class MockContainer {
  // Add any necessary mock properties or methods here
}

interface MockIWebServerConstructor extends IWebServerConstructor<IWebServer> {
  new (): MockIWebServer;
}

class MockIWebServer implements IWebServerPublic {
  getHttpServer(): Promise<Application> {
    throw new Error("Method not implemented.");
  }
  listen(port: number | string, appInfo?: any): Promise<void> {
    throw new Error("Method not implemented.");
  }
  initEnvironment(): void {
    throw new Error("Method not implemented.");
  }
  configure = jest.fn().mockResolvedValue(undefined);
}

describe("AppFactory.create() create method", () => {
  let mockContainer: MockContainer;
  let mockWebServerConstructor: MockIWebServerConstructor;
  let mockWebServerInstance: MockIWebServer;

  beforeEach(() => {
    mockContainer = new MockContainer() as any;
    mockWebServerInstance = new MockIWebServer() as any;
    mockWebServerConstructor = jest.fn(() => mockWebServerInstance) as any;
  });

  describe("Happy Path", () => {
    it("should create and configure a web server instance successfully", async () => {
      // Arrange
      const expectedInstance =
        mockWebServerInstance as unknown as IWebServerPublic;

      // Act
      const result = await AppFactory.create(
        mockContainer as any,
        mockWebServerConstructor as any,
      );

      // Assert
      expect(result).toBe(expectedInstance);
      expect(mockWebServerConstructor).toHaveBeenCalledTimes(1);
      expect(mockWebServerInstance.configure).toHaveBeenCalledWith(
        mockContainer,
      );
    });
  });

  describe("Edge Cases", () => {
    it("should throw an error if webServerType is not a constructor", async () => {
      // Arrange
      const invalidWebServerType = {} as any;

      // Act & Assert
      await expect(
        AppFactory.create(mockContainer as any, invalidWebServerType),
      ).rejects.toThrow("Invalid web server type.");
    });

    it("should handle the case where configure method rejects", async () => {
      // Arrange
      mockWebServerInstance.configure.mockRejectedValue(
        new Error("Configuration failed"),
      );

      // Act & Assert
      await expect(
        AppFactory.create(
          mockContainer as any,
          mockWebServerConstructor as any,
        ),
      ).rejects.toThrow("Configuration failed");
    });
  });
});

// End of unit tests for: create
