import { cloudflareAdapter, micro } from "@expressots/adapter-express";

const app = micro({ autoParseJson: false, showBanner: false, studio: { enabled: false } });
app.get("/", () => ({ ok: true }));

export default cloudflareAdapter(app);
