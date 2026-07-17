// Unit tests for: Relation decorators

import "reflect-metadata";
import {
  HasMany,
  HasOne,
  BelongsTo,
  ManyToMany,
  SchemaRegistry,
} from "../decorators";

describe("Relation decorators", () => {
  beforeEach(() => {
    // Clear registry before each test
    SchemaRegistry.clear();
  });

  describe("HasMany()", () => {
    it("should add hasMany relation metadata", () => {
      // Arrange
      class Post {
        id!: string;
      }

      class User {
        @HasMany(() => Post, "authorId")
        posts?: Post[];
      }

      // Act
      const user = new User();

      // Assert
      const relations =
        Reflect.getMetadata("expressots:db:relation", User) || [];
      expect(relations).toHaveLength(1);
      expect(relations[0]).toMatchObject({
        type: "hasMany",
        foreignKey: "authorId",
        field: "posts",
      });
    });
  });

  describe("HasOne()", () => {
    it("should add hasOne relation metadata", () => {
      // Arrange
      class Profile {
        id!: string;
      }

      class User {
        @HasOne(() => Profile, "userId")
        profile?: Profile;
      }

      // Act
      const user = new User();

      // Assert
      const relations =
        Reflect.getMetadata("expressots:db:relation", User) || [];
      expect(relations).toHaveLength(1);
      expect(relations[0]).toMatchObject({
        type: "hasOne",
        foreignKey: "userId",
        field: "profile",
      });
    });
  });

  describe("BelongsTo()", () => {
    it("should add belongsTo relation metadata", () => {
      // Arrange
      class User {
        id!: string;
      }

      class Post {
        @BelongsTo(() => User, "authorId")
        author?: User;

        authorId!: string;
      }

      // Act
      const post = new Post();

      // Assert
      const relations =
        Reflect.getMetadata("expressots:db:relation", Post) || [];
      expect(relations).toHaveLength(1);
      expect(relations[0]).toMatchObject({
        type: "belongsTo",
        foreignKey: "authorId",
        field: "author",
      });
    });
  });

  describe("ManyToMany()", () => {
    it("should add manyToMany relation metadata", () => {
      // Arrange
      class Tag {
        id!: string;
      }

      class Post {
        @ManyToMany(() => Tag, "post_tags")
        tags?: Tag[];
      }

      // Act
      const post = new Post();

      // Assert
      const relations =
        Reflect.getMetadata("expressots:db:relation", Post) || [];
      expect(relations).toHaveLength(1);
      expect(relations[0]).toMatchObject({
        type: "manyToMany",
        through: "post_tags",
        field: "tags",
      });
    });
  });

  describe("Multiple relations", () => {
    it("should support multiple relations on same class", () => {
      // Arrange
      class Post {
        id!: string;
      }

      class Profile {
        id!: string;
      }

      class User {
        @HasMany(() => Post, "authorId")
        posts?: Post[];

        @HasOne(() => Profile, "userId")
        profile?: Profile;
      }

      // Act
      const user = new User();

      // Assert
      const relations =
        Reflect.getMetadata("expressots:db:relation", User) || [];
      expect(relations).toHaveLength(2);
      expect(
        relations.find((r: { type: string }) => r.type === "hasMany"),
      ).toBeDefined();
      expect(
        relations.find((r: { type: string }) => r.type === "hasOne"),
      ).toBeDefined();
    });
  });
});
