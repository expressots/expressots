import { SELF } from "cloudflare:test";
import { describe, expect, it, vi } from "vitest";

// Runs inside workerd against Miniflare's real KV, D1, R2 and Queue
// implementations, so a binding that resolves here resolves in production.
describe("cloudflareBindings on workerd", () => {
  it("resolves a KV namespace through req.services", async () => {
    const write = await SELF.fetch("https://fixture/kv/theme", { method: "PUT", body: "dark" });
    expect(write.status).toBe(204);

    const read = await SELF.fetch("https://fixture/kv/theme");
    expect(read.status).toBe(200);
    expect(await read.text()).toBe("dark");

    const missing = await SELF.fetch("https://fixture/kv/absent");
    expect(missing.status).toBe(404);
  });

  it("resolves a D1 database through req.services", async () => {
    const response = await SELF.fetch("https://fixture/d1/items", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "item-1", value: "ready" }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: "item-1", value: "ready" });
  });

  it("resolves an R2 bucket through req.services", async () => {
    const write = await SELF.fetch("https://fixture/r2/fixture.txt", {
      method: "PUT",
      body: "file-body",
    });
    expect(write.status).toBe(204);

    const read = await SELF.fetch("https://fixture/r2/fixture.txt");
    expect(await read.text()).toBe("file-body");
  });

  it("resolves a Queue producer through req.services and reaches the consumer", async () => {
    const key = crypto.randomUUID();
    const publish = await SELF.fetch(`https://fixture/jobs/${key}`, {
      method: "POST",
      body: "queued",
    });
    expect(publish.status).toBe(202);

    const result = await vi.waitUntil(
      async () => {
        const response = await SELF.fetch(`https://fixture/jobs/${key}`);
        return response.ok ? response.text() : undefined;
      },
      { timeout: 10_000, interval: 50 },
    );
    expect(result).toBe("QUEUED");
  }, 15_000);

  it("reports binding presence from the live environment", async () => {
    expect(await (await SELF.fetch("https://fixture/has/SETTINGS")).json()).toEqual({
      present: true,
    });
    expect(await (await SELF.fetch("https://fixture/has/NOT_DECLARED")).json()).toEqual({
      present: false,
    });
    // Inherited object properties are never bindings.
    expect(await (await SELF.fetch("https://fixture/has/toString")).json()).toEqual({
      present: false,
    });
  });
});
