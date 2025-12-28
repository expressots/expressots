// Unit tests for: SchemaRegistry

import "reflect-metadata";
import {
  SchemaRegistry,
  Entity,
  EntityMetadata,
  Index,
  Unique,
  AutoGenerate,
  Default,
} from "../decorators";

describe("SchemaRegistry", () => {
  beforeEach(() => {
    SchemaRegistry.clear();
  });

  describe("register()", () => {
    it("should register entity with metadata", () => {
      // Arrange
      @Entity({ name: "test-users" })
      class User {
        id!: string;
      }

      // Act
      const metadata = SchemaRegistry.getMetadata(User);

      // Assert
      expect(metadata).toBeDefined();
      expect(metadata?.name).toBe("test-users");
    });

    it("should register entity by name", () => {
      // Arrange
      @Entity({ name: "test-users" })
      class User {
        id!: string;
      }

      // Act
      const entityClass = SchemaRegistry.getByName("test-users");

      // Assert
      expect(entityClass).toBe(User);
    });
  });

  describe("getMetadata()", () => {
    it("should return metadata for registered entity", () => {
      // Arrange
      @Entity({ name: "users", validate: true })
      class User {
        id!: string;
      }

      // Act
      const metadata = SchemaRegistry.getMetadata(User);

      // Assert
      expect(metadata).toBeDefined();
      expect(metadata?.name).toBe("users");
      expect(metadata?.validate).toBe(true);
    });

    it("should return undefined for unregistered entity", () => {
      // Arrange
      class Unregistered {
        id!: string;
      }

      // Act
      const metadata = SchemaRegistry.getMetadata(Unregistered);

      // Assert
      expect(metadata).toBeUndefined();
    });
  });

  describe("getByName()", () => {
    it("should return entity class by name", () => {
      // Arrange
      @Entity({ name: "custom-name" })
      class User {
        id!: string;
      }

      // Act
      const entityClass = SchemaRegistry.getByName("custom-name");

      // Assert
      expect(entityClass).toBe(User);
    });

    it("should return undefined for non-existent name", () => {
      // Act
      const entityClass = SchemaRegistry.getByName("non-existent");

      // Assert
      expect(entityClass).toBeUndefined();
    });
  });

  describe("getAll()", () => {
    it("should return all registered entities", () => {
      // Arrange
      @Entity({ name: "users" })
      class User {
        id!: string;
      }

      @Entity({ name: "posts" })
      class Post {
        id!: string;
      }

      // Act
      const all = SchemaRegistry.getAll();

      // Assert
      expect(all).toHaveLength(2);
      expect(all.map((m) => m.name)).toContain("users");
      expect(all.map((m) => m.name)).toContain("posts");
    });

    it("should return empty array when no entities registered", () => {
      // Act
      const all = SchemaRegistry.getAll();

      // Assert
      expect(all).toEqual([]);
    });
  });

  describe("getRelations()", () => {
    it("should return relations for entity", () => {
      // Arrange
      class Post {
        id!: string;
      }

      @Entity({ name: "users" })
      class User {
        id!: string;
      }

      // Manually add relation metadata for testing
      const relations = [
        {
          type: "hasMany" as const,
          target: () => Post,
          foreignKey: "authorId",
          field: "posts" as string | symbol,
        },
      ];
      Reflect.defineMetadata("expressots:db:relation", relations, User);

      // Act
      const result = SchemaRegistry.getRelations(User);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("hasMany");
    });

    it("should return empty array when no relations", () => {
      // Arrange
      @Entity({ name: "users" })
      class User {
        id!: string;
      }

      // Act
      const result = SchemaRegistry.getRelations(User);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe("getIndexes()", () => {
    it("should return index metadata for entity", () => {
      // Arrange
      @Entity({ name: "users" })
      class User {
        @Index()
        email!: string;

        @Index({ name: "custom_idx" })
        username!: string;
      }

      // Act
      const indexes = SchemaRegistry.getIndexes(User);

      // Assert
      expect(indexes).toHaveLength(2);
      expect(indexes.find((i) => i.field === "email")).toBeDefined();
      expect(indexes.find((i) => i.field === "username")).toBeDefined();
    });

    it("should return empty array when no indexes", () => {
      // Arrange
      @Entity({ name: "users" })
      class User {
        id!: string;
      }

      // Act
      const indexes = SchemaRegistry.getIndexes(User);

      // Assert
      expect(indexes).toEqual([]);
    });
  });

  describe("getUniqueFields()", () => {
    it("should return unique field metadata for entity", () => {
      // Arrange
      @Entity({ name: "users" })
      class User {
        @Unique()
        email!: string;

        @Unique()
        username!: string;
      }

      // Act
      const uniqueFields = SchemaRegistry.getUniqueFields(User);

      // Assert
      expect(uniqueFields).toContain("email");
      expect(uniqueFields).toContain("username");
      expect(uniqueFields).toHaveLength(2);
    });

    it("should return empty array when no unique fields", () => {
      // Arrange
      @Entity({ name: "users" })
      class User {
        id!: string;
      }

      // Act
      const uniqueFields = SchemaRegistry.getUniqueFields(User);

      // Assert
      expect(uniqueFields).toEqual([]);
    });
  });

  describe("getAutoGenerateFields()", () => {
    it("should return auto-generate metadata for entity", () => {
      // Arrange
      @Entity({ name: "users" })
      class User {
        @AutoGenerate("uuid")
        id!: string;

        @AutoGenerate("cuid")
        slug!: string;
      }

      // Act
      const autoGenerate = SchemaRegistry.getAutoGenerateFields(User);

      // Assert
      expect(autoGenerate).toEqual({ id: "uuid", slug: "cuid" });
    });

    it("should return empty object when no auto-generate fields", () => {
      // Arrange
      @Entity({ name: "users" })
      class User {
        id!: string;
      }

      // Act
      const autoGenerate = SchemaRegistry.getAutoGenerateFields(User);

      // Assert
      expect(autoGenerate).toEqual({});
    });
  });

  describe("getDefaults()", () => {
    it("should return default values metadata for entity", () => {
      // Arrange
      @Entity({ name: "users" })
      class User {
        @Default(true)
        isActive!: boolean;

        @Default("guest")
        role!: string;
      }

      // Act
      const defaults = SchemaRegistry.getDefaults(User);

      // Assert
      expect(defaults).toEqual({ isActive: true, role: "guest" });
    });

    it("should return empty object when no default values", () => {
      // Arrange
      @Entity({ name: "users" })
      class User {
        id!: string;
      }

      // Act
      const defaults = SchemaRegistry.getDefaults(User);

      // Assert
      expect(defaults).toEqual({});
    });
  });

  describe("clear()", () => {
    it("should clear all registered entities", () => {
      // Arrange
      @Entity({ name: "users" })
      class User {
        id!: string;
      }

      @Entity({ name: "posts" })
      class Post {
        id!: string;
      }

      // Act
      SchemaRegistry.clear();

      // Assert
      expect(SchemaRegistry.getAll()).toHaveLength(0);
      expect(SchemaRegistry.getMetadata(User)).toBeUndefined();
      expect(SchemaRegistry.getByName("users")).toBeUndefined();
    });
  });
});

