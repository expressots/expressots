import express from "express";
import { micro } from "../micro";
import {
  CloudflareBindingNotFoundError,
  cloudflareBindings,
  type CloudflareContext,
  type CloudflareRequest,
  cloudflareAdapter,
} from "./index";

interface FakeKv {
  getWithMetadata(key: string): Promise<{ value: string | null }>;
}

interface Env {
  SETTINGS: FakeKv;
}

const context: CloudflareContext = {
  waitUntil: () => undefined,
  passThroughOnException: () => undefined,
};

const bindings = cloudflareBindings<Env>();
const Settings = bindings.kv("SETTINGS");

function kvReturning(value: string): FakeKv {
  return { getWithMetadata: async () => ({ value }) };
}

describe("cloudflareAdapter binding services", () => {
  it("types handlers through micro<CloudflareRequest<Env>>() and resolves tokens per request", async () => {
    const app = micro<CloudflareRequest<Env>>({ showBanner: false, studio: { enabled: false } });
    app.get("/theme", async (req) => ({
      // No cast: req.services and req.cloudflare.env are typed from Env.
      theme: (await req.services.get(Settings).getWithMetadata("theme")).value,
      direct: (await req.cloudflare.env.SETTINGS.getWithMetadata("theme")).value,
    }));

    const worker = cloudflareAdapter<Env>(app);
    const response = await worker.fetch(
      new Request("https://worker.example/theme"),
      { SETTINGS: kvReturning("dark") },
      context,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ theme: "dark", direct: "dark" });
  });

  it("keeps binding values isolated between concurrent requests", async () => {
    const app = micro<CloudflareRequest<Env>>({ showBanner: false, studio: { enabled: false } });
    let entered = 0;
    let releaseBoth!: () => void;
    const bothEntered = new Promise<void>((resolve) => {
      releaseBoth = resolve;
    });

    app.get("/theme", async (req) => {
      entered += 1;
      if (entered === 2) releaseBoth();
      // Hold both requests inside the handler so any shared state would
      // surface as one request seeing the other's env.
      await bothEntered;
      return req.services.get(Settings).getWithMetadata("theme");
    });

    const worker = cloudflareAdapter<Env>(app);
    const [first, second] = await Promise.all([
      worker.fetch(
        new Request("https://worker.example/theme"),
        { SETTINGS: kvReturning("first") },
        context,
      ),
      worker.fetch(
        new Request("https://worker.example/theme"),
        { SETTINGS: kvReturning("second") },
        context,
      ),
    ]);

    expect(await first.json()).toEqual({ value: "first" });
    expect(await second.json()).toEqual({ value: "second" });
  });

  it("routes a missing binding to the app error handler as a named error", async () => {
    const app = micro<CloudflareRequest<Env>>({ showBanner: false, studio: { enabled: false } });
    app.get("/theme", (req) => req.services.get(Settings));
    app.setErrorHandler(((error, _req, res, next) => {
      if (error instanceof CloudflareBindingNotFoundError) {
        res.status(503).json({ code: error.code, binding: error.bindingName });
        return;
      }
      next(error);
    }) satisfies express.ErrorRequestHandler);

    const worker = cloudflareAdapter(app);
    const response = await worker.fetch(new Request("https://worker.example/theme"), {}, context);

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      code: "EXPRESSOTS_CLOUDFLARE_BINDING_NOT_FOUND",
      binding: "SETTINGS",
    });
  });

  it("installs req.services on plain Express apps too", async () => {
    const app = express();
    app.get("/probe", (request, response) => {
      const req = request as CloudflareRequest<Env>;
      response.json({
        hasServices: typeof req.services.get === "function",
        present: req.services.has(Settings),
      });
    });

    const worker = cloudflareAdapter<Env>(app);
    const response = await worker.fetch(
      new Request("https://worker.example/probe"),
      { SETTINGS: kvReturning("x") },
      context,
    );

    expect(await response.json()).toEqual({ hasServices: true, present: true });
  });
});
