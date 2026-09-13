import {
  cloudflareAdapter,
  cloudflareBindings,
  type CloudflareRequest,
  micro,
} from "@expressots/adapter-express";
import type { Env, QueueJob } from "./env";

// Tokens are created once at module scope. That is safe: they hold a name
// and a kind, never a binding value.
const bindings = cloudflareBindings<Env>();
const Settings = bindings.kv("SETTINGS");
const QueueResults = bindings.kv("QUEUE_RESULTS");
const Database = bindings.d1("DB");
const Files = bindings.r2("FILES");
const Jobs = bindings.queue("JOBS");

const app = micro<CloudflareRequest<Env>>({
  autoParseJson: false,
  showBanner: false,
  studio: { enabled: false },
});

app.put("/kv/:key", async (req, res) => {
  await req.services.get(Settings).put(String(req.params.key), String(req.body));
  res.status(204).end();
});

app.get("/kv/:key", async (req, res) => {
  const value = await req.services.get(Settings).get(String(req.params.key));
  if (value === null) {
    res.status(404).end();
    return;
  }
  res.send(value);
});

app.post("/d1/items", async (req) => {
  const db = req.services.get(Database);
  await db.exec("CREATE TABLE IF NOT EXISTS items (id TEXT PRIMARY KEY, value TEXT NOT NULL)");
  const { id, value } = req.body as { id: string; value: string };
  await db.prepare("INSERT OR REPLACE INTO items (id, value) VALUES (?, ?)").bind(id, value).run();
  return db
    .prepare("SELECT id, value FROM items WHERE id = ?")
    .bind(id)
    .first<{ id: string; value: string }>();
});

app.put("/r2/:key", async (req, res) => {
  await req.services.get(Files).put(String(req.params.key), String(req.body));
  res.status(204).end();
});

app.get("/r2/:key", async (req, res) => {
  const object = await req.services.get(Files).get(String(req.params.key));
  if (object === null) {
    res.status(404).end();
    return;
  }
  res.send(await object.text());
});

app.post("/jobs/:key", async (req, res) => {
  await req.services.get(Jobs).send({ key: String(req.params.key), value: String(req.body) });
  res.status(202).end();
});

app.get("/jobs/:key", async (req, res) => {
  const value = await req.services.get(QueueResults).get(String(req.params.key));
  if (value === null) {
    res.status(404).end();
    return;
  }
  res.send(value);
});

// Binding presence is per request: `has()` answers from this request's env.
app.get("/has/:name", (req) => ({
  present: req.services.has(cloudflareBindings().kv(String(req.params.name))),
}));

const adapter = cloudflareAdapter<Env>(app);

export default {
  fetch: adapter.fetch,
  async queue(batch: MessageBatch<QueueJob>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      await env.QUEUE_RESULTS.put(message.body.key, message.body.value.toUpperCase());
      message.ack();
    }
  },
} satisfies ExportedHandler<Env, QueueJob>;
