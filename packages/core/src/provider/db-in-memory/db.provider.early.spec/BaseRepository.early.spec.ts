// Unit tests for: BaseRepository

import { InMemoryDBProvider, BaseRepository } from "../db.provider";
import { IEntity } from "../schema/entity.interface";

interface TestEntity extends IEntity {
  name: string;
  email: string;
}

class TestRepository extends BaseRepository<TestEntity> {
  constructor(db: InMemoryDBProvider) {
    super(db, "test");
  }
}

describe("BaseRepository", () => {
  let provider: InMemoryDBProvider;
  let repository: TestRepository;

  beforeEach(() => {
    provider = new InMemoryDBProvider();
    repository = new TestRepository(provider);
  });

  describe("Constructor", () => {
    it("should create repository with table name", () => {
      // Assert
      expect((repository as any).tableName).toBe("test");
      expect((repository as any).adapter).toBeDefined();
    });

    it("should create repository with entity class", () => {
      // Arrange
      class TestEntityClass {}
      class TestRepoWithClass extends BaseRepository<TestEntity> {
        constructor(db: InMemoryDBProvider) {
          super(db, "test", TestEntityClass);
        }
      }

      // Act
      const repo = new TestRepoWithClass(provider);

      // Assert
      expect((repo as any).adapter).toBeDefined();
    });
  });

  describe("Delegation Methods", () => {
    it("should delegate findUnique to adapter", async () => {
      // Arrange
      await repository.create({ data: { id: "1", name: "Test", email: "test@test.com" } });

      // Act
      const result = await repository.findUnique({ where: { id: "1" } });

      // Assert
      expect(result).toBeTruthy();
      expect(result?.name).toBe("Test");
    });

    it("should delegate findFirst to adapter", async () => {
      // Arrange
      await repository.create({ data: { id: "1", name: "Test", email: "test@test.com" } });

      // Act
      const result = await repository.findFirst({ where: { name: "Test" } });

      // Assert
      expect(result).toBeTruthy();
      expect(result?.name).toBe("Test");
    });

    it("should delegate findMany to adapter", async () => {
      // Arrange
      await repository.create({ data: { id: "1", name: "Test", email: "test@test.com" } });
      await repository.create({ data: { id: "2", name: "Test2", email: "test2@test.com" } });

      // Act
      const results = await repository.findMany();

      // Assert
      expect(results.length).toBe(2);
    });

    it("should delegate create to adapter", async () => {
      // Act
      const result = await repository.create({
        data: { id: "1", name: "Test", email: "test@test.com" },
      });

      // Assert
      expect(result).toBeTruthy();
      expect(result.name).toBe("Test");
    });

    it("should delegate createMany to adapter", async () => {
      // Act
      const result = await repository.createMany({
        data: [
          { id: "1", name: "Test1", email: "test1@test.com" },
          { id: "2", name: "Test2", email: "test2@test.com" },
        ],
      });

      // Assert
      expect(result.count).toBe(2);
    });

    it("should delegate update to adapter", async () => {
      // Arrange
      await repository.create({ data: { id: "1", name: "Test", email: "test@test.com" } });

      // Act
      const result = await repository.update({
        where: { id: "1" },
        data: { name: "Updated" },
      });

      // Assert
      expect(result.name).toBe("Updated");
    });

    it("should delegate updateMany to adapter", async () => {
      // Arrange
      await repository.create({ data: { id: "1", name: "Test", email: "test@test.com" } });
      await repository.create({ data: { id: "2", name: "Test", email: "test2@test.com" } });

      // Act
      const result = await repository.updateMany({
        where: { name: "Test" },
        data: { name: "Updated" },
      });

      // Assert
      expect(result.count).toBe(2);
    });

    it("should delegate upsert to adapter", async () => {
      // Act
      const result = await repository.upsert({
        where: { id: "1" },
        create: { id: "1", name: "Test", email: "test@test.com" },
        update: { name: "Updated" },
      });

      // Assert
      expect(result).toBeTruthy();
    });

    it("should delegate delete to adapter", async () => {
      // Arrange
      await repository.create({ data: { id: "1", name: "Test", email: "test@test.com" } });

      // Act
      const result = await repository.delete({ where: { id: "1" } });

      // Assert
      expect(result).toBeTruthy();
    });

    it("should delegate deleteMany to adapter", async () => {
      // Arrange
      await repository.create({ data: { id: "1", name: "Test", email: "test@test.com" } });
      await repository.create({ data: { id: "2", name: "Test2", email: "test2@test.com" } });

      // Act
      const result = await repository.deleteMany({ where: { name: "Test" } });

      // Assert
      expect(result.count).toBe(1);
    });

    it("should delegate count to adapter", async () => {
      // Arrange
      await repository.create({ data: { id: "1", name: "Test", email: "test@test.com" } });
      await repository.create({ data: { id: "2", name: "Test2", email: "test2@test.com" } });

      // Act
      const result = await repository.count();

      // Assert
      expect(result).toBe(2);
    });

    it("should delegate aggregate to adapter", async () => {
      // Arrange
      await repository.create({ data: { id: "1", name: "Test", email: "test@test.com" } });

      // Act
      const result = await repository.aggregate({
        _count: true,
      });

      // Assert
      expect(result).toBeTruthy();
    });

    it("should delegate transaction to adapter", async () => {
      // Act
      const result = await repository.transaction(async (tx) => {
        await tx.create({ data: { id: "1", name: "Test", email: "test@test.com" } });
        return "success";
      });

      // Assert
      expect(result).toBe("success");
    });
  });
});

