import { MemoryDriver } from "../src/memory.driver";

describe("bounded memory LRU", () => {
  let now = 100;
  let driver: MemoryDriver;
  beforeEach(() => {
    now = 100;
    driver = new MemoryDriver(2, () => now);
  });
  it("evicts least recently read; has does not update recency", async () => {
    await driver.set("a", "a", 0);
    await driver.set("b", "b", 0);
    await driver.get("a");
    await driver.has("b");
    await driver.set("c", "c", 0);
    expect(await driver.get("b")).toBeUndefined();
    expect(await driver.get("a")).toBe("a");
  });
  it("overwriting updates recency and expiry", async () => {
    await driver.set("a", "old", 1);
    await driver.set("b", "b", 0);
    await driver.set("a", "new", 0);
    now++;
    await driver.set("c", "c", 0);
    expect(await driver.get("b")).toBeUndefined();
    expect(await driver.get("a")).toBe("new");
  });
  it("sweeps expired entries before evicting live entries", async () => {
    await driver.set("live", "yes", 0);
    await driver.set("expired", "no", 5);
    now += 5;
    await driver.set("new", "yes", 0);
    expect(await driver.has("live")).toBe(true);
    expect(await driver.has("expired")).toBe(false);
  });
  it("keeps storage bounded and releases it on shutdown", async () => {
    for (let i = 0; i < 100; i++) await driver.set(`${i}`, `${i}`, 0);
    expect(await driver.has("97")).toBe(false);
    expect(await driver.has("98")).toBe(true);
    await driver.shutdown();
    expect(await driver.has("98")).toBe(false);
    expect(await driver.connected()).toBe(false);
  });
  it("expires precisely at the deadline on has and del", async () => {
    await driver.set("a", "a", 5);
    await driver.set("b", "b", 5);
    now += 5;
    expect(await driver.has("a")).toBe(false);
    expect(await driver.del("b")).toBe(false);
  });
});
