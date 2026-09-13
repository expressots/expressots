export interface QueueJob {
  key: string;
  value: string;
}

/** Mirrors the bindings declared in wrangler.toml. */
export interface Env {
  SETTINGS: KVNamespace;
  QUEUE_RESULTS: KVNamespace;
  DB: D1Database;
  FILES: R2Bucket;
  JOBS: Queue<QueueJob>;
}
