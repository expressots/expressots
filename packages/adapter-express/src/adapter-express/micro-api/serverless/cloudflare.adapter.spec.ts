import express from "express";
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

  it("returns a 404 JSON response for an unmatched route", async () => {
    const worker = createBodyEchoWorker();
    const response = await worker.fetch(
      new Request("https://worker.example/missing", {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: "plain text",
      }),
      {},
      context,
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toBe("application/json");

    // micro() finalizes its middleware stack on the first request now, so the
    // RFC-7807 body reaches serverless targets too rather than being wired
    // only inside listen(). The adapter's plain {"error":"Not Found"} remains
    // as defence in depth for apps that are not micro apps.
    expect(await response.json()).toMatchObject({
      type: "https://expressots.dev/errors/not-found",
      title: "Route Not Found",
      status: 404,
      detail: "Route 'POST /missing' does not exist",
      instance: "/missing",
    });
  }, 1000);

  it("still falls back to a plain 404 when the app is not a micro app", async () => {
    const bareApp = express();
    bareApp.post("/echo", (_req, res) => {
      res.json({ ok: true });
    });

    const worker = cloudflareAdapter(bareApp);
    const response = await worker.fetch(
      new Request("https://worker.example/missing", { method: "POST" }),
      {},
      context,
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Not Found" });
  }, 1000);

  it.each([["text/plain", "plain text"]])(
    "keeps %s payloads as text",
    async (contentType, requestBody) => {
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
    },
  );

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

describe("cloudflareAdapter response fidelity", () => {
  function workerFor(register: (app: ReturnType<typeof micro>) => void): CloudflareHandler {
    const app = micro({
      autoParseJson: false,
      showBanner: false,
      studio: { enabled: false },
    });
    register(app);
    return cloudflareAdapter(app.getApp());
  }

  it("emits one Set-Cookie header per cookie instead of collapsing them", async () => {
    const worker = workerFor((app) => {
      app.get("/cookies", (_req, res) => {
        res.cookie("a", "1");
        res.cookie("b", "2");
        return { ok: true };
      });
    });

    const response = await worker.fetch(new Request("https://worker.example/cookies"), {}, context);

    // getSetCookie() is the only accessor that exposes the individual
    // entries; get() joins them, which is exactly the bug being guarded.
    const cookies = response.headers.getSetCookie();
    expect(cookies).toHaveLength(2);
    expect(cookies[0]).toContain("a=1");
    expect(cookies[1]).toContain("b=2");
  });

  it("honours a directly assigned res.statusCode", async () => {
    const worker = workerFor((app) => {
      app.get("/created", (_req, res) => {
        res.statusCode = 201;
        return { ok: true };
      });
    });

    const response = await worker.fetch(new Request("https://worker.example/created"), {}, context);

    expect(response.status).toBe(201);
  });

  it.each([204, 205, 304])("returns %i without a body under Node/undici", async (status) => {
    const worker = workerFor((app) => {
      app.get("/empty", (_req, res) => {
        res.status(status).end();
      });
    });

    const response = await worker.fetch(new Request("https://worker.example/empty"), {}, context);

    // Passing even an empty Buffer for these statuses throws in undici and
    // would surface as a 500 from the adapter's catch-all.
    expect(response.status).toBe(status);
    expect(response.body).toBeNull();
  });
});

describe("cloudflareAdapter serverless guards", () => {
  it("serves requests with micro()'s default auto-parsing enabled", async () => {
    // No autoParseJson: false — the adapter must stand the parsers down
    // itself, or body-parser reaches for req.socket and 500s every request.
    const app = micro({ showBanner: false, studio: { enabled: false } });
    app.post("/echo", (request) => ({ body: request.body }));

    const worker = cloudflareAdapter(app);
    const response = await worker.fetch(
      new Request("https://worker.example/echo", {
        method: "POST",
        headers: { "content-type": "application/json", "content-length": "13" },
        body: JSON.stringify({ hi: "there" }),
      }),
      {},
      context,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ body: { hi: "there" } });
  });

  it("throws a named error when stream-reading middleware is registered", () => {
    const app = micro({
      autoParseJson: false,
      showBanner: false,
      studio: { enabled: false },
    });
    app.use(express.json());

    expect(() => cloudflareAdapter(app)).toThrow(/cloudflareAdapter: express\.json\(\)/);
    expect(() => cloudflareAdapter(app)).toThrow(/req\.body/);
  });

  it("accepts a MicroApp, an app.getApp() result, and a bare express app", async () => {
    const build = (): ReturnType<typeof micro> => {
      const app = micro({
        autoParseJson: false,
        showBanner: false,
        studio: { enabled: false },
      });
      app.get("/", () => ({ ok: true }));
      return app;
    };

    const bare = express();
    bare.get("/", (_req, res) => {
      res.json({ ok: true });
    });

    for (const handler of [
      cloudflareAdapter(build()),
      cloudflareAdapter(build().getApp()),
      cloudflareAdapter(bare),
    ]) {
      const response = await handler.fetch(new Request("https://worker.example/"), {}, context);
      expect(await response.json()).toEqual({ ok: true });
    }
  });
});

describe("micro() finalize outside listen()", () => {
  it("runs setErrorHandler on a serverless target", async () => {
    const app = micro({
      autoParseJson: false,
      showBanner: false,
      studio: { enabled: false },
    });
    app.get("/boom", () => {
      throw new Error("nope");
    });
    app.setErrorHandler((_err, _req, res, _next) => {
      res.status(418).json({ handled: true });
    });

    const worker = cloudflareAdapter(app);
    const response = await worker.fetch(new Request("https://worker.example/boom"), {}, context);

    expect(response.status).toBe(418);
    expect(await response.json()).toEqual({ handled: true });
  });
});

describe("cloudflareAdapter request fidelity", () => {
  function echoWorker(config?: Parameters<typeof cloudflareAdapter>[1]): CloudflareHandler {
    const app = micro({ showBanner: false, studio: { enabled: false } });
    app.post("/echo", (request) => {
      const body = request.body as unknown;
      if (Buffer.isBuffer(body)) {
        return { kind: "buffer", bytes: Array.from(body) };
      }
      return { kind: typeof body, body: body ?? null };
    });
    app.get("/query", (request) => ({ query: request.query }));
    return cloudflareAdapter(app, config);
  }

  it("round-trips binary bodies byte for byte", async () => {
    // 0xFF/0xFE/0xC8 are invalid UTF-8. text() would replace each with U+FFFD
    // and lose the original irrecoverably.
    const bytes = new Uint8Array([0x00, 0x01, 0x02, 0xff, 0xfe, 0xc8]);
    const worker = echoWorker();

    const response = await worker.fetch(
      new Request("https://worker.example/echo", {
        method: "POST",
        headers: { "content-type": "application/octet-stream" },
        body: bytes,
      }),
      {},
      context,
    );

    expect(await response.json()).toEqual({
      kind: "buffer",
      bytes: [0x00, 0x01, 0x02, 0xff, 0xfe, 0xc8],
    });
  });

  it("parses multipart/form-data without corrupting file bytes", async () => {
    const form = new FormData();
    form.append("name", "widget");
    form.append(
      "file",
      new Blob([new Uint8Array([0xff, 0x00, 0xc8])], { type: "application/octet-stream" }),
      "raw.bin",
    );

    const app = micro({ showBanner: false, studio: { enabled: false } });
    app.post("/upload", (request) => {
      const body = request.body as Record<string, unknown>;
      const file = body.file as { filename: string; size: number; data: Buffer };
      return {
        name: body.name,
        filename: file.filename,
        size: file.size,
        bytes: Array.from(file.data),
      };
    });

    const worker = cloudflareAdapter(app);
    const response = await worker.fetch(
      new Request("https://worker.example/upload", { method: "POST", body: form }),
      {},
      context,
    );

    expect(await response.json()).toEqual({
      name: "widget",
      filename: "raw.bin",
      size: 3,
      bytes: [0xff, 0x00, 0xc8],
    });
  });

  it.each([
    ["tag=a&tag=b", { tag: ["a", "b"] }],
    ["n[]=x&n[]=y", { n: ["x", "y"] }],
    ["u[name]=jo", { u: { name: "jo" } }],
  ])("parses urlencoded %s the way express.urlencoded does", async (raw, expected) => {
    const worker = echoWorker();
    const response = await worker.fetch(
      new Request("https://worker.example/echo", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: raw,
      }),
      {},
      context,
    );

    expect(await response.json()).toEqual({ kind: "object", body: expected });
  });

  it("keeps duplicate query keys instead of letting the last one win", async () => {
    const worker = echoWorker();
    const response = await worker.fetch(
      new Request("https://worker.example/query?tag=a&tag=b&u[name]=jo"),
      {},
      context,
    );

    expect(await response.json()).toEqual({
      query: { tag: ["a", "b"], u: { name: "jo" } },
    });
  });

  it("rejects a body larger than maxBodySize with 413 from content-length", async () => {
    const worker = echoWorker({ maxBodySize: 16 });
    const response = await worker.fetch(
      new Request("https://worker.example/echo", {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: "x".repeat(64),
      }),
      {},
      context,
    );

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: "Payload Too Large", limit: 16 });
  });

  it("allows a body at the limit", async () => {
    const worker = echoWorker({ maxBodySize: 16 });
    const response = await worker.fetch(
      new Request("https://worker.example/echo", {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: "x".repeat(16),
      }),
      {},
      context,
    );

    expect(response.status).toBe(200);
  });

  it("treats maxBodySize: 0 as unlimited", async () => {
    const worker = echoWorker({ maxBodySize: 0 });
    const response = await worker.fetch(
      new Request("https://worker.example/echo", {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: "x".repeat(4096),
      }),
      {},
      context,
    );

    expect(response.status).toBe(200);
  });
});
