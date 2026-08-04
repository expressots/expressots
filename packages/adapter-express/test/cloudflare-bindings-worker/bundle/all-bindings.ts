import {
  cloudflareAdapter,
  cloudflareBindings,
  type CloudflareRequest,
  micro,
} from "@expressots/adapter-express";
import type { BindingsEnv } from "../src/env";

const bindings = cloudflareBindings<BindingsEnv>();
const Settings = bindings.kv("SETTINGS");
const Database = bindings.d1("DB");
const Files = bindings.r2("FILES");
const Jobs = bindings.queue("JOBS");
const app = micro<CloudflareRequest<BindingsEnv>>({
  showBanner: false,
  studio: { enabled: false },
});

app.get("/bindings", (req) => ({
  kv: Boolean(req.services.get(Settings)),
  d1: Boolean(req.services.get(Database)),
  r2: Boolean(req.services.get(Files)),
  queue: Boolean(req.services.get(Jobs)),
}));

export default cloudflareAdapter(app, { bindings });
