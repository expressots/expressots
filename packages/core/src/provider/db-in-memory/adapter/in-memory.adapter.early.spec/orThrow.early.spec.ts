// Unit tests for: InMemoryAdapter findUniqueOrThrow / findFirstOrThrow

import "reflect-metadata";
import { InMemoryAdapter } from "../in-memory.adapter";
import { IEntity } from "../../schema/entity.interface";
import { EntityNotFoundError } from "../../storage/memory-store";

interface UserModel extends IEntity {
  name: string;
  email: string;
  age: number;
}

describe("InMemoryAdapter OrThrow methods", () => {
  let users: InMemoryAdapter<UserModel>;

  beforeEach(() => {
    users = new InMemoryAdapter<UserModel>("orthrow_users");
  });

  describe("findUniqueOrThrow", () => {
    it("returns the entity when found", async () => {
      const created = await users.create({
        data: { name: "John", email: "john@example.com", age: 30 },
      });

      const result = await users.findUniqueOrThrow({
        where: { id: created.id },
      });

      expect(result.id).toBe(created.id);
      expect(result.name).toBe("John");
    });

    it("throws EntityNotFoundError when not found by id", async () => {
      await expect(
        users.findUniqueOrThrow({ where: { id: "missing" } }),
      ).rejects.toBeInstanceOf(EntityNotFoundError);
    });

    it("throws EntityNotFoundError when not found by unique field", async () => {
      await expect(
        users.findUniqueOrThrow({ where: { email: "nobody@example.com" } }),
      ).rejects.toThrow(EntityNotFoundError);
    });
  });

  describe("findFirstOrThrow", () => {
    it("returns the first matching entity", async () => {
      await users.create({
        data: { name: "John", email: "john@example.com", age: 30 },
      });
      await users.create({
        data: { name: "Jane", email: "jane@example.com", age: 25 },
      });

      const result = await users.findFirstOrThrow({
        where: { age: { gte: 18 } },
        orderBy: { age: "asc" },
      });

      expect(result.name).toBe("Jane");
    });

    it("throws EntityNotFoundError when nothing matches", async () => {
      await users.create({
        data: { name: "John", email: "john@example.com", age: 30 },
      });

      await expect(
        users.findFirstOrThrow({ where: { age: { gte: 65 } } }),
      ).rejects.toBeInstanceOf(EntityNotFoundError);
    });

    it("throws EntityNotFoundError on an empty table", async () => {
      await expect(users.findFirstOrThrow()).rejects.toThrow(
        EntityNotFoundError,
      );
    });
  });
});
