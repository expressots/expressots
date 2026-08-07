import { cloudflareAdapter, cloudflareBindings, micro } from "@expressots/adapter-express";
import type { BindingsEnv } from "../src/env";

const bindings = cloudflareBindings<BindingsEnv>();
const app = micro({
  showBanner: false,
  studio: { enabled: false },
});
app.get("/", () => ({ ok: true }));

export default cloudflareAdapter(app, { bindings });
