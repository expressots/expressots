// Unit tests for: InMemoryAdapter subscriptions

import "reflect-metadata";
import { InMemoryAdapter, InMemoryDatabase } from "../in-memory.adapter";
import { IEntity } from "../../schema/entity.interface";
import { ChangeType } from "../adapter.interface";

interface TestEntity extends IEntity {
  name: string;
  email: string;
}

describe("InMemoryAdapter subscriptions", () => {
  let adapter: InMemoryAdapter<TestEntity>;

  beforeEach(() => {
    adapter = new InMemoryAdapter<TestEntity>("test");
  });

  describe("subscribe()", () => {
    it("should notify subscribers on create", async () => {
      // Arrange
      const callback = jest.fn();
      const subscription = adapter.subscribe(callback);

      // Act
      await adapter.create({
        data: { name: "John", email: "john@example.com" },
      });

      // Assert
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "create",
          data: expect.objectContaining({ name: "John" }),
        }),
      );

      subscription.unsubscribe();
    });

    it("should notify subscribers on update", async () => {
      // Arrange
      const created = await adapter.create({
        data: { name: "John", email: "john@example.com" },
      });
      const callback = jest.fn();
      const subscription = adapter.subscribe(callback);

      // Act
      await adapter.update({
        where: { id: created.id },
        data: { name: "Jane" },
      });

      // Assert
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "update",
          data: expect.objectContaining({ name: "Jane" }),
        }),
      );

      subscription.unsubscribe();
    });

    it("should notify subscribers on delete", async () => {
      // Arrange
      const created = await adapter.create({
        data: { name: "John", email: "john@example.com" },
      });
      const callback = jest.fn();
      const subscription = adapter.subscribe(callback);

      // Act
      await adapter.delete({ where: { id: created.id } });

      // Assert
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "delete",
          previousData: expect.objectContaining({ id: created.id }),
        }),
      );

      subscription.unsubscribe();
    });

    it("should handle errors in subscription callbacks gracefully", async () => {
      // Arrange
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const callback = jest.fn(() => {
        throw new Error("Callback error");
      });
      const subscription = adapter.subscribe(callback);

      // Act
      await adapter.create({
        data: { name: "John", email: "john@example.com" },
      });

      // Assert
      expect(callback).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error in subscription callback:",
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
      subscription.unsubscribe();
    });

    it("should allow unsubscribing", async () => {
      // Arrange
      const callback = jest.fn();
      const subscription = adapter.subscribe(callback);

      // Act
      subscription.unsubscribe();
      await adapter.create({
        data: { name: "John", email: "john@example.com" },
      });

      // Assert
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("on()", () => {
    it("should notify type-specific subscribers on create", async () => {
      // Arrange
      const callback = jest.fn();
      const subscription = adapter.on("create", callback);

      // Act
      await adapter.create({
        data: { name: "John", email: "john@example.com" },
      });

      // Assert
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "create",
        }),
      );

      subscription.unsubscribe();
    });

    it("should notify type-specific subscribers on update", async () => {
      // Arrange
      const created = await adapter.create({
        data: { name: "John", email: "john@example.com" },
      });
      const callback = jest.fn();
      const subscription = adapter.on("update", callback);

      // Act
      await adapter.update({
        where: { id: created.id },
        data: { name: "Jane" },
      });

      // Assert
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "update",
        }),
      );

      subscription.unsubscribe();
    });

    it("should notify type-specific subscribers on delete", async () => {
      // Arrange
      const created = await adapter.create({
        data: { name: "John", email: "john@example.com" },
      });
      const callback = jest.fn();
      const subscription = adapter.on("delete", callback);

      // Act
      await adapter.delete({ where: { id: created.id } });

      // Assert
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "delete",
        }),
      );

      subscription.unsubscribe();
    });

    it("should not notify subscribers for different event types", async () => {
      // Arrange
      const createCallback = jest.fn();
      const updateCallback = jest.fn();
      const createSub = adapter.on("create", createCallback);
      const updateSub = adapter.on("update", updateCallback);

      // Act
      await adapter.create({
        data: { name: "John", email: "john@example.com" },
      });

      // Assert
      expect(createCallback).toHaveBeenCalledTimes(1);
      expect(updateCallback).not.toHaveBeenCalled();

      createSub.unsubscribe();
      updateSub.unsubscribe();
    });

    it("should handle errors in type-specific subscription callbacks", async () => {
      // Arrange
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const callback = jest.fn(() => {
        throw new Error("Callback error");
      });
      const subscription = adapter.on("create", callback);

      // Act
      await adapter.create({
        data: { name: "John", email: "john@example.com" },
      });

      // Assert
      expect(callback).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error in subscription callback:",
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
      subscription.unsubscribe();
    });

    it("should allow unsubscribing from type-specific subscriptions", async () => {
      // Arrange
      const callback = jest.fn();
      const subscription = adapter.on("create", callback);

      // Act
      subscription.unsubscribe();
      await adapter.create({
        data: { name: "John", email: "john@example.com" },
      });

      // Assert
      expect(callback).not.toHaveBeenCalled();
    });

    it("should handle multiple subscribers for same type", async () => {
      // Arrange
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const sub1 = adapter.on("create", callback1);
      const sub2 = adapter.on("create", callback2);

      // Act
      await adapter.create({
        data: { name: "John", email: "john@example.com" },
      });

      // Assert
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);

      sub1.unsubscribe();
      sub2.unsubscribe();
    });
  });
});
