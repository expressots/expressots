// Unit tests for: Field decorators (PrimaryKey, AutoGenerate, Index, Unique, Nullable, Default)

import "reflect-metadata";
import {
  PrimaryKey,
  AutoGenerate,
  Index,
  Unique,
  Nullable,
  Default,
  DB_METADATA_KEYS,
  SchemaRegistry,
} from "../decorators";

describe("Field decorators", () => {
  beforeEach(() => {
    SchemaRegistry.clear();
  });

  describe("PrimaryKey()", () => {
    it("should add primary key metadata when none exists", () => {
      // Arrange
      class User {
        @PrimaryKey()
        id!: string;
      }

      // Act
      const user = new User();

      // Assert
      const primaryKeys = Reflect.getMetadata(
        DB_METADATA_KEYS.primaryKey,
        User,
      );
      expect(primaryKeys).toEqual(["id"]);
    });

    it("should append to existing primary key metadata", () => {
      // Arrange
      class User {
        @PrimaryKey()
        id1!: string;

        @PrimaryKey()
        id2!: string;
      }

      // Act
      const user = new User();

      // Assert
      const primaryKeys = Reflect.getMetadata(
        DB_METADATA_KEYS.primaryKey,
        User,
      );
      expect(primaryKeys).toContain("id1");
      expect(primaryKeys).toContain("id2");
      expect(primaryKeys).toHaveLength(2);
    });
  });

  describe("AutoGenerate()", () => {
    it("should add auto-generate metadata when none exists", () => {
      // Arrange
      class User {
        @AutoGenerate("uuid")
        id!: string;
      }

      // Act
      const user = new User();

      // Assert
      const autoGenerate = Reflect.getMetadata(
        DB_METADATA_KEYS.autoGenerate,
        User,
      );
      expect(autoGenerate).toEqual({ id: "uuid" });
    });

    it("should merge with existing auto-generate metadata", () => {
      // Arrange
      class User {
        @AutoGenerate("uuid")
        id!: string;

        @AutoGenerate("cuid")
        slug!: string;
      }

      // Act
      const user = new User();

      // Assert
      const autoGenerate = Reflect.getMetadata(
        DB_METADATA_KEYS.autoGenerate,
        User,
      );
      expect(autoGenerate).toEqual({ id: "uuid", slug: "cuid" });
    });
  });

  describe("Index()", () => {
    it("should add index metadata when none exists", () => {
      // Arrange
      class User {
        @Index()
        email!: string;
      }

      // Act
      const user = new User();

      // Assert
      const indexes = Reflect.getMetadata(DB_METADATA_KEYS.index, User);
      expect(indexes).toHaveLength(1);
      expect(indexes[0]).toMatchObject({
        field: "email",
        name: "idx_email",
      });
    });

    it("should append to existing index metadata", () => {
      // Arrange
      class User {
        @Index()
        email!: string;

        @Index({ name: "custom_idx_name" })
        username!: string;
      }

      // Act
      const user = new User();

      // Assert
      const indexes = Reflect.getMetadata(DB_METADATA_KEYS.index, User);
      expect(indexes).toHaveLength(2);
      expect(indexes.find((i) => i.field === "email")).toBeDefined();
      expect(indexes.find((i) => i.field === "username")).toBeDefined();
    });

    it("should handle composite index", () => {
      // Arrange
      class User {
        @Index({ composite: ["firstName", "lastName"] })
        firstName!: string;
      }

      // Act
      const user = new User();

      // Assert
      const indexes = Reflect.getMetadata(DB_METADATA_KEYS.index, User);
      expect(indexes[0].composite).toEqual(["firstName", "lastName"]);
    });
  });

  describe("Unique()", () => {
    it("should add unique metadata when none exists", () => {
      // Arrange
      class User {
        @Unique()
        email!: string;
      }

      // Act
      const user = new User();

      // Assert
      const uniqueFields = Reflect.getMetadata(DB_METADATA_KEYS.unique, User);
      expect(uniqueFields).toEqual(["email"]);
    });

    it("should append to existing unique metadata", () => {
      // Arrange
      class User {
        @Unique()
        email!: string;

        @Unique()
        username!: string;
      }

      // Act
      const user = new User();

      // Assert
      const uniqueFields = Reflect.getMetadata(DB_METADATA_KEYS.unique, User);
      expect(uniqueFields).toContain("email");
      expect(uniqueFields).toContain("username");
      expect(uniqueFields).toHaveLength(2);
    });
  });

  describe("Nullable()", () => {
    it("should add nullable metadata when none exists", () => {
      // Arrange
      class User {
        @Nullable()
        middleName?: string;
      }

      // Act
      const user = new User();

      // Assert
      const nullableFields = Reflect.getMetadata(
        DB_METADATA_KEYS.nullable,
        User,
      );
      expect(nullableFields).toEqual(["middleName"]);
    });

    it("should append to existing nullable metadata", () => {
      // Arrange
      class User {
        @Nullable()
        middleName?: string;

        @Nullable()
        nickname?: string;
      }

      // Act
      const user = new User();

      // Assert
      const nullableFields = Reflect.getMetadata(
        DB_METADATA_KEYS.nullable,
        User,
      );
      expect(nullableFields).toContain("middleName");
      expect(nullableFields).toContain("nickname");
      expect(nullableFields).toHaveLength(2);
    });
  });

  describe("Default()", () => {
    it("should add default value metadata when none exists", () => {
      // Arrange
      class User {
        @Default(true)
        isActive!: boolean;
      }

      // Act
      const user = new User();

      // Assert
      const defaults = Reflect.getMetadata(DB_METADATA_KEYS.default, User);
      expect(defaults).toEqual({ isActive: true });
    });

    it("should merge with existing default metadata", () => {
      // Arrange
      class User {
        @Default(true)
        isActive!: boolean;

        @Default("guest")
        role!: string;
      }

      // Act
      const user = new User();

      // Assert
      const defaults = Reflect.getMetadata(DB_METADATA_KEYS.default, User);
      expect(defaults).toEqual({ isActive: true, role: "guest" });
    });

    it("should handle factory function defaults", () => {
      // Arrange
      class User {
        @Default(() => new Date())
        createdAt!: Date;
      }

      // Act
      const user = new User();

      // Assert
      const defaults = Reflect.getMetadata(DB_METADATA_KEYS.default, User);
      expect(defaults.createdAt).toBeInstanceOf(Function);
      expect(defaults.createdAt()).toBeInstanceOf(Date);
    });
  });
});

