// Unit tests for: MemoryStore maxRecordsPerTable + validation constraints

import "reflect-metadata";
import {
  MemoryStore,
  MaxRecordsExceededError,
  EntityValidationError,
} from "../memory-store";
import { IEntity } from "../../schema/entity.interface";
import {
  Entity,
  PrimaryKey,
  AutoGenerate,
  Unique,
  Nullable,
} from "../../schema/decorators";

interface Row extends IEntity {
  value: number;
}

@Entity({ name: "validated_users", validate: true })
class ValidatedUser {
  @PrimaryKey()
  @AutoGenerate("uuid")
  id!: string;

  @Unique()
  email!: string;

  @Nullable()
  @Unique()
  nickname?: string;

  name!: string;
}

interface ValidatedUserModel extends IEntity {
  email: string;
  nickname?: string;
  name: string;
}

describe("MemoryStore maxRecordsPerTable", () => {
  it("allows unlimited records when maxRecordsPerTable is 0", () => {
    const store = new MemoryStore<Row>("rows", {
      timestamps: false,
      maxRecordsPerTable: 0,
    });
    for (let i = 0; i < 50; i++) {
      store.insert({ value: i });
    }
    expect(store.count()).toBe(50);
  });

  it("throws MaxRecordsExceededError when the limit is reached", () => {
    const store = new MemoryStore<Row>("rows", {
      timestamps: false,
      maxRecordsPerTable: 2,
    });
    store.insert({ value: 1 });
    store.insert({ value: 2 });

    expect(() => store.insert({ value: 3 })).toThrow(MaxRecordsExceededError);
    expect(store.count()).toBe(2);
  });
});

describe("MemoryStore validation (@Entity validate: true)", () => {
  let store: MemoryStore<ValidatedUserModel>;

  beforeEach(() => {
    store = new MemoryStore<ValidatedUserModel>("validated_users", {
      entityClass: ValidatedUser,
    });
  });

  it("inserts when all required fields are present", () => {
    const created = store.insert({
      email: "john@example.com",
      name: "John",
    });
    expect(created.id).toBeDefined();
    expect(created.email).toBe("john@example.com");
  });

  it("throws EntityValidationError when a required unique field is missing", () => {
    expect(() =>
      store.insert({ name: "NoEmail" } as Partial<ValidatedUserModel>),
    ).toThrow(EntityValidationError);
  });

  it("throws EntityValidationError when a required field is explicitly null", () => {
    expect(() =>
      store.insert({
        email: null,
        name: "John",
      } as unknown as Partial<ValidatedUserModel>),
    ).toThrow(EntityValidationError);
  });

  it("allows a @Nullable unique field to be omitted", () => {
    const created = store.insert({
      email: "jane@example.com",
      name: "Jane",
    });
    expect(created.nickname).toBeUndefined();
  });

  it("validates on update as well", () => {
    const created = store.insert({
      email: "john@example.com",
      name: "John",
    });

    expect(() =>
      store.update(created.id!, {
        email: null,
      } as unknown as Partial<ValidatedUserModel>),
    ).toThrow(EntityValidationError);
  });

  it("does not validate entities without validate enabled", () => {
    const plain = new MemoryStore<Row>("plain_rows", { timestamps: false });
    expect(() => plain.insert({ value: 1 })).not.toThrow();
  });
});
