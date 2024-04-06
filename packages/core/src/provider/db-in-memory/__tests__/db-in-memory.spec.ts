import "reflect-metadata";

import { it, describe, vi, beforeEach, expect } from "vitest";
import { InMemoryDB } from "../db-in-memory.provider";

describe("In Memory DB", () => {
  let db: InMemoryDB;

  beforeEach(() => {
    db = new InMemoryDB();
  });

  it("create a new table if it does not exist when getTable is called", () => {
    const tableName = "testTable";
    const table = db.getTable(tableName);
    expect(table).toEqual([]);
    expect(db.getTable(tableName)).toEqual([]);
  });

  it("show all tables when showTables is called", () => {
    const writeSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    db.getTable("table1");
    db.getTable("table2");

    db.showTables();

    expect(writeSpy).toHaveBeenCalledWith("List of tables:");
    expect(writeSpy).toHaveBeenCalledWith("\n- table1");
    expect(writeSpy).toHaveBeenCalledWith("\n- table2");
    writeSpy.mockRestore();
  });

  it("print all records in a table when printTable is called", () => {
    const tableSpy = vi.spyOn(console, "table").mockImplementation(() => true);
    const tableName = "entities";
    db.getTable(tableName).push({ id: "1" });

    db.printTable(tableName);

    expect(tableSpy).toHaveBeenCalledWith([{ id: "1" }]);
    tableSpy.mockRestore();
  });

  it("table does not exist", () => {
    const writeSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    db.printTable("nonExistentTable");

    expect(writeSpy).toHaveBeenCalledWith("Table 'nonExistentTable' is empty.");
    writeSpy.mockRestore();
  });
});
