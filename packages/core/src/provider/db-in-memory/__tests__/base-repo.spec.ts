import "reflect-metadata";
import { describe, it, beforeEach, expect, vi } from "vitest";
import { InMemoryDB } from "../db-in-memory.provider";
import { BaseRepository } from "../base-repo.repository";

// Mock entity
interface MockEntity {
  id: string;
  name: string;
}

describe("BaseRepository", () => {
  let inMemoryDB: InMemoryDB;
  let repository: BaseRepository<MockEntity>;
  const tableName = "mockEntities";

  beforeEach(() => {
    inMemoryDB = new InMemoryDB();
    repository = new BaseRepository<MockEntity>(tableName);
    // Mocking the injected InMemoryDB instance
    Reflect.defineMetadata("design:type", InMemoryDB, repository, "inMemoryDB");
    repository["inMemoryDB"] = inMemoryDB;
  });

  it("should create a new entity", () => {
    const entity: MockEntity = { id: "1", name: "Test Entity" };
    const createdEntity = repository.create(entity);

    expect(createdEntity).toEqual(entity);
    expect(inMemoryDB.getTable(tableName)).toContain(entity);
  });

  it("should throw an error when creating an entity that already exists", () => {
    const entity: MockEntity = { id: "1", name: "Test Entity" };
    repository.create(entity);

    expect(() => repository.create(entity)).toThrowError(
      `Object with id ${entity.id} already exists`,
    );
  });

  it("should delete an existing entity", () => {
    const entity: MockEntity = { id: "1", name: "Test Entity" };
    repository.create(entity);

    const deleted = repository.delete(entity.id);

    expect(deleted).toBe(true);
    expect(inMemoryDB.getTable(tableName)).not.toContain(entity);
  });

  it("should return false when trying to delete a non-existing entity", () => {
    const deleted = repository.delete("non-existing-id");
    expect(deleted).toBe(false);
  });

  it("should update an existing entity", () => {
    const entity: MockEntity = { id: "1", name: "Test Entity" };
    repository.create(entity);

    const updatedEntity: MockEntity = { id: "1", name: "Updated Entity" };
    const result = repository.update(updatedEntity);

    expect(result).toEqual(updatedEntity);
    expect(inMemoryDB.getTable(tableName)).toContain(updatedEntity);
  });

  it("should return null when trying to update a non-existing entity", () => {
    const updatedEntity: MockEntity = {
      id: "non-existing-id",
      name: "Updated Entity",
    };
    const result = repository.update(updatedEntity);

    expect(result).toBeNull();
  });

  it("should find an existing entity by id", () => {
    const entity: MockEntity = { id: "1", name: "Test Entity" };
    repository.create(entity);

    const foundEntity = repository.find(entity.id);

    expect(foundEntity).toEqual(entity);
  });

  it("should return null when trying to find a non-existing entity by id", () => {
    const foundEntity = repository.find("non-existing-id");
    expect(foundEntity).toBeNull();
  });

  it("should find all entities in the table", () => {
    const entity1: MockEntity = { id: "1", name: "Entity 1" };
    const entity2: MockEntity = { id: "2", name: "Entity 2" };
    repository.create(entity1);
    repository.create(entity2);

    const allEntities = repository.findAll();

    expect(allEntities).toContain(entity1);
    expect(allEntities).toContain(entity2);
  });

  it("should return an empty array when the table is empty", () => {
    const allEntities = repository.findAll();
    expect(allEntities).toEqual([]);
  });
});
