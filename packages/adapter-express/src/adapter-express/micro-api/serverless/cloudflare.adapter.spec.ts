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
