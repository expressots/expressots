/// <reference types="@cloudflare/workers-types" />

export interface QueueJob {
  key: string;
  value: string;
}

export interface BindingsEnv {
  SETTINGS: KVNamespace;
  DB: D1Database;
  FILES: R2Bucket;
  JOBS: Queue<QueueJob>;
  QUEUE_RESULTS: KVNamespace;
}
