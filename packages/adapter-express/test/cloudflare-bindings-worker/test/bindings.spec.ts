import { SELF } from "cloudflare:test";
import { describe, expect, it, vi } from "vitest";

describe("Cloudflare binding providers", () => {
  it("uses KV through req.services", async () => {
    const write = await SELF.fetch("https://example.com/kv", {
      method: "POST",
      body: "dark",
    });
    expect(write.status).toBe(204);

    const read = await SELF.fetch("https://example.com/kv");
    expect(await read.text()).toBe("dark");
  });

  it("uses D1 through req.services", async () => {
    const response = await SELF.fetch("https://example.com/d1", {
      method: "POST",
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: "item-1", value: "ready" });
  });

  it("uses R2 through req.services", async () => {
    const write = await SELF.fetch("https://example.com/r2", {
      method: "POST",
      body: "file-body",
    });
    expect(write.status).toBe(204);

    const read = await SELF.fetch("https://example.com/r2");
    expect(await read.text()).toBe("file-body");
  });

  it("uses a Queue producer through req.services", async () => {
    const key = crypto.randomUUID();
    const publish = await SELF.fetch(`https://example.com/queue?key=${key}`, {
      method: "POST",
      body: "queued",
    });
    expect(publish.status).toBe(202);

    const result = await vi.waitUntil(
      async () => {
        const response = await SELF.fetch(`https://example.com/queue-result?key=${key}`);
        if (!response.ok) return undefined;
        return response.text();
      },
      { timeout: 10_000, interval: 50 },
    );

    expect(result).toBe("QUEUED");
  }, 15_000);
});
