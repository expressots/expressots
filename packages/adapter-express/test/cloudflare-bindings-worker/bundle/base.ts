import { cloudflareAdapter, micro } from "@expressots/adapter-express";

const app = micro({
  showBanner: false,
  studio: { enabled: false },
});
app.get("/", () => ({ ok: true }));

export default cloudflareAdapter(app);
