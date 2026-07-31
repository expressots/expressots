import { micro } from "../micro";
import { cloudflareAdapter, CloudflareContext, CloudflareHandler } from "./cloudflare.adapter";

const context: CloudflareContext = {
  waitUntil: () => undefined,
  passThroughOnException: () => undefined,
};

function createBodyEchoWorker(): CloudflareHandler {
  const app = micro({
    autoParseJson: false,
    showBanner: false,
    studio: { enabled: false },
  });
  app.post("/echo", (request) => ({
    body: request.body === undefined ? null : request.body,
  }));

  return cloudflareAdapter(app.getApp());
}

describe("cloudflareAdapter request bodies", () => {
  it.each(["application/json", "application/problem+json; charset=utf-8"])(
    "parses %s payloads as JSON",
    async (contentType) => {
      const worker = createBodyEchoWorker();
      const response = await worker.fetch(
        new Request("https://worker.example/echo", {
          method: "POST",
          headers: { "content-type": contentType },
          body: JSON.stringify({ name: "widget" }),
        }),
        {},
        context,
      );

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        body: { name: "widget" },
      });
    },
  );

  it("keeps an empty JSON request body safe", async () => {
    const worker = createBodyEchoWorker();
    const response = await worker.fetch(
      new Request("https://worker.example/echo", {
        method: "POST",
        headers: { "content-type": "application/json" },
      }),
      {},
      context,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ body: null });
  });

  it("returns a controlled 400 response for malformed JSON", async () => {
    const worker = createBodyEchoWorker();
    const response = await worker.fetch(
      new Request("https://worker.example/echo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: '{"name":',
      }),
      {},
      context,
    );

    expect(response.status).toBe(400);
    expect(response.headers.get("content-type")).toBe("application/json");
    expect(await response.json()).toEqual({ error: "Bad Request" });
  });

  it.each([
    ["text/plain", "plain text"],
    ["application/octet-stream", "raw-payload"],
  ])("keeps %s payloads as text", async (contentType, requestBody) => {
    const worker = createBodyEchoWorker();
    const response = await worker.fetch(
      new Request("https://worker.example/echo", {
        method: "POST",
        headers: { "content-type": contentType },
        body: requestBody,
      }),
      {},
      context,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ body: requestBody });
  });

  it("parses URL-encoded payloads into a key/value object", async () => {
    const worker = createBodyEchoWorker();
    const response = await worker.fetch(
      new Request("https://worker.example/echo", {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded; charset=utf-8",
        },
        body: "name=Jane+Doe&role=admin",
      }),
      {},
      context,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      body: { name: "Jane Doe", role: "admin" },
    });
  });
});
