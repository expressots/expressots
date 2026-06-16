# ExpressoTS v4 micro-benchmark

This folder contains a minimal, **reproducible** k6 + tiny-server harness used to compare ExpressoTS against Express, Fastify, Hapi and NestJS for the simplest possible workload (`GET /` returning `Hello Expresso TS!`).

The intent is **not** to publish a TechEmpower-class result. The intent is to give v4 users a deterministic baseline they can re-run to validate that ExpressoTS does not pay an unreasonable tax on top of Express - and a starting point for their own workload-specific benchmarks.

## What is in this folder

| File                                | Role                                                                  |
| ----------------------------------- | --------------------------------------------------------------------- |
| `benchmark.js`                      | k6 load script: 1000 VUs, 60s duration, `GET /` with 1s sleep.        |
| `express.js`                        | Bare Express 4 server.                                                |
| `fastify.js`                        | Bare Fastify server.                                                  |
| `nest.js` + `nestjs/`               | Compiled NestJS minimal server.                                       |
| `happi.js`                          | Bare Hapi server.                                                     |
| `expressots/main.ts` + supporting   | ExpressoTS v4 opinionated app with the same single GET `/`.           |

## Method

For each target:

1. Start the server bound to port 3000 (every server uses the same port for URL parity in `benchmark.js`).
2. Run `k6 run benchmark.js`.
3. Capture k6's summary block: req/s, p50, p95, p99, failure rate.
4. Stop the server. Move on.

For a clean run, **always** restart between targets. Do not chain.

## Reproducing locally

Requires Node 20.18.0+ and [k6](https://k6.io/docs/getting-started/installation/) on your `PATH`.

```bash
# from this folder

# Express
node express.js &
k6 run benchmark.js
kill %1

# Fastify
node fastify.js &
k6 run benchmark.js
kill %1

# Hapi
node happi.js &
k6 run benchmark.js
kill %1

# Nest
node nest.js &
k6 run benchmark.js
kill %1

# ExpressoTS v4 (built upstream by `node ../scripts/pack-all.mjs`)
npx tsx expressots/main.ts &
k6 run benchmark.js
kill %1
```

If you are running on Windows, use separate terminals instead of `&` and `kill %1`.

## Acceptable result envelope (v4 GA target)

For the trivial `GET /` workload, the v4 GA quality bar is:

- ExpressoTS req/s **>= 90 percent of bare Express** on the same hardware.
- p99 **within 10 percent** of bare Express.
- **Zero** request failures over 60 seconds.

Anything below that envelope on the maintainers' reference machine blocks the GA tag. Numbers from previous runs are tracked in `RESULTS/` (created when the benchmark is run during release engineering).

## Why we do not commit numbers in this file

A single number printed in source has a 100 percent chance of being misleading the moment hardware, Node version, kernel scheduler, or k6 version change. The harness above lets anyone produce numbers in 5 minutes; we keep authority over numbers in `RESULTS/<date>-<commit>.md` instead.

## Caveats

- This is **single-route** throughput; real-world routing trees, middleware chains, JSON payloads, and database I/O all change the picture significantly.
- ExpressoTS pays a small startup tax for DI registration and metadata reflection. The micro-benchmark intentionally measures **steady-state** throughput, not cold start.
- The Hapi and Nest entries exist for context only; we do not target parity with framework-of-the-week.
- `vus: 1000` saturates a single Node process on most laptops; if you push more, also raise OS file descriptor limits.

## Next steps

- Add a multi-route harness (`100` routes, `1000` middleware) for a more realistic profile.
- Add `--http2` and TLS variants once Node 22+ is the minimum.
- Add JSON-payload variants (`POST /` with 1 KB and 100 KB bodies).

These are tracked for v4.1 in [../../ROADMAP_v4.1.md](../../ROADMAP_v4.1.md).
