// Unit tests for: QueryEngine cursor pagination

import "reflect-metadata";
import { MemoryStore } from "../../storage/memory-store";
import { QueryEngine } from "../query-engine";
import { IEntity } from "../../schema/entity.interface";

interface Item extends IEntity {
  seq: number;
}

describe("QueryEngine.executeCursor", () => {
  let store: MemoryStore<Item>;
  let engine: QueryEngine<Item>;

  beforeEach(() => {
    store = new MemoryStore<Item>("cursor_items", { timestamps: false });
    engine = new QueryEngine<Item>(store);
    for (let i = 1; i <= 5; i++) {
      store.insert({ id: String(i), seq: i });
    }
  });

  it("returns all entities unchanged when no cursor is provided", () => {
    const result = engine.executeFindMany({ orderBy: { seq: "asc" } });
    expect(result.map((e) => e.id)).toEqual(["1", "2", "3", "4", "5"]);
  });

  it("starts the result set at the cursor (inclusive)", () => {
    const result = engine.executeFindMany({
      orderBy: { seq: "asc" },
      cursor: { id: "3" },
    });
    expect(result.map((e) => e.id)).toEqual(["3", "4", "5"]);
  });

  it("excludes the cursor row with skip: 1", () => {
    const result = engine.executeFindMany({
      orderBy: { seq: "asc" },
      cursor: { id: "3" },
      skip: 1,
    });
    expect(result.map((e) => e.id)).toEqual(["4", "5"]);
  });

  it("combines cursor with take for page windows", () => {
    const result = engine.executeFindMany({
      orderBy: { seq: "asc" },
      cursor: { id: "2" },
      skip: 1,
      take: 2,
    });
    expect(result.map((e) => e.id)).toEqual(["3", "4"]);
  });

  it("returns an empty array when the cursor is not found", () => {
    const result = engine.executeFindMany({
      orderBy: { seq: "asc" },
      cursor: { id: "999" },
    });
    expect(result).toEqual([]);
  });

  it("respects the ordering when locating the cursor", () => {
    const result = engine.executeFindMany({
      orderBy: { seq: "desc" },
      cursor: { id: "3" },
    });
    expect(result.map((e) => e.id)).toEqual(["3", "2", "1"]);
  });
});
