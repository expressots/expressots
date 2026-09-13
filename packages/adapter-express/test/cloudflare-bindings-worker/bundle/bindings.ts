import {
  cloudflareAdapter,
  cloudflareBindings,
  type CloudflareRequest,
  micro,
} from "@expressots/adapter-express";
import type { Env } from "../src/env";

const bindings = cloudflareBindings<Env>();
const Settings = bindings.kv("SETTINGS");
const Database = bindings.d1("DB");
const Files = bindings.r2("FILES");
const Jobs = bindings.queue("JOBS");

const app = micro<CloudflareRequest<Env>>({
  autoParseJson: false,
  showBanner: false,
  studio: { enabled: false },
});
app.get("/", (req) => ({
  kv: req.services.has(Settings),
  d1: req.services.has(Database),
  r2: req.services.has(Files),
  queue: req.services.has(Jobs),
}));

export default cloudflareAdapter<Env>(app);
