// Unit tests for: InMemoryAdapter many-to-many relation resolution

import "reflect-metadata";
import { InMemoryAdapter, InMemoryDatabase } from "../in-memory.adapter";
import { IEntity } from "../../schema/entity.interface";
import { Entity, ManyToMany } from "../../schema/decorators";

interface PostModel extends IEntity {
  title: string;
  tags?: TagModel[];
}

interface TagModel extends IEntity {
  label: string;
}

interface PostTagJoin extends IEntity {
  postId: string;
  tagId: string;
}

@Entity({ name: "m2m_posts" })
class Post {
  id!: string;
  title!: string;

  @ManyToMany(() => Tag, "post_tags")
  tags?: Tag[];
}

@Entity({ name: "m2m_tags" })
class Tag {
  id!: string;
  label!: string;
}

describe("InMemoryAdapter many-to-many resolution", () => {
  let db: InMemoryDatabase;
  let posts: InMemoryAdapter<PostModel>;
  let tags: InMemoryAdapter<TagModel>;
  let joinTable: InMemoryAdapter<PostTagJoin>;

  beforeEach(() => {
    db = new InMemoryDatabase();
    posts = db.table<PostModel>("m2m_posts", Post);
    tags = db.table<TagModel>("m2m_tags", Tag);
    // Join table follows the `<sourceClass>Id` / `<targetClass>Id` convention.
    joinTable = db.table<PostTagJoin>("post_tags");
  });

  it("resolves manyToMany via the join table", async () => {
    const post = await posts.create({ data: { title: "Hello" } });
    const tagA = await tags.create({ data: { label: "typescript" } });
    const tagB = await tags.create({ data: { label: "node" } });

    await joinTable.create({ data: { postId: post.id!, tagId: tagA.id! } });
    await joinTable.create({ data: { postId: post.id!, tagId: tagB.id! } });

    const result = await posts.findUnique({
      where: { id: post.id },
      include: { tags: true },
    });

    expect(result).not.toBeNull();
    const resolvedTags = (result as PostModel).tags;
    expect(Array.isArray(resolvedTags)).toBe(true);
    expect(resolvedTags?.length).toBe(2);
    expect(resolvedTags?.map((t) => t.label).sort()).toEqual([
      "node",
      "typescript",
    ]);
  });

  it("returns an empty array when there are no join records", async () => {
    const post = await posts.create({ data: { title: "Lonely" } });

    const result = await posts.findUnique({
      where: { id: post.id },
      include: { tags: true },
    });

    expect(result).not.toBeNull();
    expect((result as PostModel).tags).toEqual([]);
  });
});
