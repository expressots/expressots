import {
  cloudflareAdapter,
  cloudflareBindings,
  type CloudflareRequest,
  micro,
} from "@expressots/adapter-express";
import type { BindingsEnv, QueueJob } from "./env";

const bindings = cloudflareBindings<BindingsEnv>();
const Settings = bindings.kv("SETTINGS");
const Database = bindings.d1("DB");
const Files = bindings.r2("FILES");
const Jobs = bindings.queue("JOBS");
const QueueResults = bindings.kv("QUEUE_RESULTS");

const app = micro<CloudflareRequest<BindingsEnv>>({
  showBanner: false,
  studio: { enabled: false },
});

app.post("/kv", async (req, res) => {
  await req.services.get(Settings).put("theme", String(req.body));
  res.status(204).end();
});

app.get("/kv", async (req, res) => {
  const value = await req.services.get(Settings).get("theme");
  if (value === null) {
    res.status(404).end();
    return;
  }
  res.send(value);
});

app.post("/d1", async (req) => {
  const database = req.services.get(Database);
  await database.exec(
    "CREATE TABLE IF NOT EXISTS items (id TEXT PRIMARY KEY, value TEXT NOT NULL); DELETE FROM items;",
  );
  await database
    .prepare("INSERT INTO items (id, value) VALUES (?, ?)")
    .bind("item-1", "ready")
    .run();
  return database
    .prepare("SELECT id, value FROM items WHERE id = ?")
    .bind("item-1")
    .first<{ id: string; value: string }>();
});

app.post("/r2", async (req, res) => {
  await req.services.get(Files).put("fixture.txt", String(req.body));
  res.status(204).end();
});

app.get("/r2", async (req, res) => {
  const object = await req.services.get(Files).get("fixture.txt");
  if (object === null) {
    res.status(404).end();
    return;
  }
  res.send(await object.text());
});

app.post("/queue", async (req, res) => {
  const key = String(req.query.key ?? "");
  await req.services.get(Jobs).send({ key, value: String(req.body) });
  res.status(202).send("Accepted");
});

app.get("/queue-result", async (req, res) => {
  const key = String(req.query.key ?? "");
  const value = await req.services.get(QueueResults).get(key);
  if (value === null) {
    res.status(404).end();
    return;
  }
  res.send(value);
});

const adapter = cloudflareAdapter(app, { bindings });

export default {
  fetch: adapter.fetch,
  async queue(batch: MessageBatch<QueueJob>, env: BindingsEnv): Promise<void> {
    for (const message of batch.messages) {
      await env.QUEUE_RESULTS.put(message.body.key, message.body.value.toUpperCase());
      message.ack();
    }
  },
} satisfies ExportedHandler<BindingsEnv>;
