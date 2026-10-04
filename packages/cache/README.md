# @expressots/cache

Official ExpressoTS 4.x cache system plugin. Caching stays in this package;
core only supplies DI, capability discovery and lifecycle hooks.

## Install and register

```sh
ex add @expressots/cache
# Only for the Redis driver:
npm install ioredis@^5.6.1
```

`ex add` installs the npm package using the application's package manager. It
neither edits application code nor scans npm metadata. Import the provider and
include it in your application's modules. The provider template's public index,
dual CJS/ESM entries and declarations are retained. Discovery metadata comes
from `@provideSingleton(CacheProvider, "external")`, not a package.json field.
The singleton implements `IProvider`, `IConfigurable<CacheConfig>`, `IHealthCheck`,
`IMetrics`, `IBootstrap` and `IShutdown`.

```ts
import { AppExpress } from "@expressots/adapter-express";
import { AppContainer, CreateModule } from "@expressots/core";
import { CacheProvider } from "@expressots/cache";
import { MyController } from "./my.controller";

export class App extends AppExpress {
  private readonly container: AppContainer = this.configContainer([
    CreateModule([MyController, CacheProvider]),
  ]);

  configureServices(): void {
    const cache = this.container.Container.get(CacheProvider);
    const result = cache.configure({
      driver: "memory",
      namespace: "my-app",
      capacity: 1000,
      defaultTtl: 60_000,
    });
    if (!result.valid) throw new Error(result.errors?.join("; "));
    this.Middleware.applyPreset("api");
  }
}
```

`configureServices()` runs before the provider bootstrap hooks. The framework
automatically calls `bootstrap()` before serving requests and `shutdown()` on
shutdown. Do not use cache operations until bootstrap has completed. Configure
the same singleton that controllers inject; do not construct a second instance.

```ts
import { inject } from "@expressots/core";
import { controller, Get } from "@expressots/adapter-express";
import { CacheProvider } from "@expressots/cache";

@controller("/cache-demo")
export class MyController {
  constructor(@inject(CacheProvider) private readonly cache: CacheProvider) {}

  @Get("/")
  async demo() {
    await this.cache.set("answer", { value: 42 }, 10_000);
    const answer = await this.cache.get<{ value: number }>("answer");
    const exists = await this.cache.has("answer");
    const removed = await this.cache.del("answer");
    await this.cache.clear();
    return { answer, exists, removed };
  }
}
```

`get<T>` describes expected JSON data; it does not perform schema validation of
T. Validate application schemas at your boundary. All five operations return
promises: `get` returns a value or `undefined` for a miss, `set` and `clear`
return `void`, and `del` and `has` return booleans. `del` is true only when an
unexpired entry was removed. Empty string keys are allowed. Keys must be strings.

## Configuration

No constructor arguments are needed for DI. `configure(config)` validates early
and returns `{ valid, errors? }`. Configuration is fieldwise: explicitly supplied
code values override environment values, then defaults apply. Without configure,
bootstrap reads the environment. Failed configuration does not replace the last
valid configuration. Configuration is copied and locked once initialization
starts; configure returns invalid during initialization, after readiness, and
after shutdown. Failed initialization cleans up and permits configure/retry.

For Redis, use the same registration with:

```ts
const result = cache.configure({
  driver: "redis",
  namespace: "my-app:production",
  defaultTtl: 60_000,
  redis: {
    url: process.env.REDIS_URL,
    timeoutMs: 2000,
  },
});
if (!result.valid) throw new Error(result.errors?.join("; "));
```

Alternatively, call `loadEnvSync()` in `main.ts` before `bootstrap(App)` (as in
example 10), omit code configuration, and set:

```dotenv
CACHE_DRIVER=redis
CACHE_NAMESPACE=my-app:production
CACHE_DEFAULT_TTL_MS=60000
CACHE_CAPACITY=1000
REDIS_URL=redis://127.0.0.1:6379
CACHE_REDIS_TIMEOUT_MS=2000
```

| Field / environment                      | Default                | Validation                                  |
| ---------------------------------------- | ---------------------- | ------------------------------------------- |
| driver / CACHE_DRIVER                    | memory                 | memory or redis                             |
| namespace / CACHE_NAMESPACE              | default                | Non-empty Unicode, at most 1024 UTF-8 bytes |
| defaultTtl / CACHE_DEFAULT_TTL_MS        | 0                      | Non-negative safe integer                   |
| capacity / CACHE_CAPACITY                | 1000                   | Positive safe integer                       |
| redis.url / REDIS_URL                    | redis://127.0.0.1:6379 | redis:// or rediss:// URL                   |
| redis.timeoutMs / CACHE_REDIS_TIMEOUT_MS | 2000                   | Integer from 1 to 2147483647                |

TTL is in **milliseconds**. The per-entry TTL overrides the default, including
`0` for no expiry. Omitted/undefined TTL uses the configured default. Zero is
non-expiring; negative, fractional, non-finite, unsafe integer, null and non-number
TTL arguments reject before storing. Overwrites replace both value and expiry;
a non-expiring overwrite removes a previous Redis expiry atomically. A read at
the expiry deadline is a miss. Redis uses `SET ... PX`; persistent writes use
plain `SET`.

Namespaces isolate Redis keys using a UTF-8 byte-length frame:
`expressots-cache:<byte-length>:<namespace>:`. Overlapping names and names
containing colons, Unicode or Redis glob characters are safe; clear escapes glob
characters and verifies every returned prefix. User keys are JSON-encoded to
keep even malformed Unicode keys distinct. Memory is private to each provider
instance, so independent instances do not share data even with the same namespace.
Redis instances with the same namespace intentionally share data. Choose a
namespace per application/environment and include tenant/user identifiers in
keys where required. The safe default `default` cannot affect non-cache Redis
keys, but applications sharing Redis should choose distinct namespaces.

`clear` removes only this provider's entries. Redis uses cursor-based `SCAN`
with deletion batches of at most 100; it never calls KEYS, FLUSHDB or FLUSHALL.
SCAN clearing is not a snapshot: concurrent writes may survive or be deleted;
quiesce writers if an empty namespace must be guaranteed.

## Values and memory behavior

Both drivers store serialized JSON and return independent copies. Supported:
null, booleans, finite numbers (except negative zero), strings, dense arrays and
plain objects recursively containing those types. False, zero, empty strings
and null remain hits. Undefined is reserved for misses and cannot be stored,
including inside arrays/objects. Dates, class instances, Map, Set, Buffer,
BigInt, functions, symbols, cycles, sparse arrays, accessors, hidden properties,
non-finite numbers and negative zero reject explicitly instead of silently
losing types. Object prototypes and object identity are not retained. Redis data
written outside this package must obey this format; invalid data rejects as a
backend read error rather than returning a miss.

Memory has zero additional runtime dependencies. It uses a bounded Map LRU;
successful get updates recency, has does not, and overwriting updates recency.
Expired entries are removed lazily on access and swept at capacity before
live entries are evicted. Capacity bounds entry count, not serialized byte size.
There are no timers. Shutdown releases all memory entries.

## Health, metrics and lifecycle

`await cache.healthCheck()` returns the actual capability contract:
`{ status, latency, checkedAt, details: { driver, connected, state } }`.
Memory is healthy only after bootstrap and before shutdown. Redis requires a
ready client and successful bounded PING; disconnection reports unhealthy.
Credentials and URLs are never included in health or metrics output.

`cache.getMetrics()` returns `{ driver, hits, misses, errors, hitRatio }`.
Only get affects counters. Expired get counts as a miss; backend/serialization
read failures increment errors without hits/misses. Validation/lifecycle errors
and other operations do not affect these counters. Counters are per provider
instance, clear does not reset them, and zero successful requests gives ratio 0.
Hit ratio is hits / (hits + misses), from 0 to 1.

Operations before bootstrap or after shutdown reject. Repeated bootstrap while
ready and repeated shutdown are safe; shutdown is terminal. Shutdown during
initialization waits for the bounded initialization attempt then releases its
connection. Redis is imported only when selected. Memory imports and usage do
not resolve or initialize ioredis. Missing ioredis produces an install instruction.
Redis initialization/commands have finite timeouts, zero retries, no offline
queue and no reconnect loop. Failure never silently switches drivers. Owned
connections are disconnected immediately on shutdown. No raw connection errors
or credentials are propagated.

## Optional @Cacheable(ttl): deferred

The existing DI scope implementation (`packages/core/src/di/scope/scope.ts`)
receives requestScope only during container resolution. Method decorators
(`packages/core/src/di/annotation/property_event_decorator.ts`) store metadata;
they do not receive the current resolution context or a tenant identity. A
standalone `@Cacheable(ttl)` wrapper therefore cannot resolve the right provider
without a global container or extra application conventions, nor infer safe
cross-user keys. This package does not change core/DI to add those hooks. Inject
CacheProvider explicitly and choose tenant-aware keys in application methods.

## Tests and unpublished-package verification

From the monorepo root:

```sh
pnpm --filter @expressots/cache... build
pnpm --filter @expressots/cache test
# Real Redis, required for acceptance (no mocked command semantics):
docker run --rm -p 6379:6379 redis:7.2-alpine
CACHE_TEST_REDIS_URL=redis://127.0.0.1:6379 pnpm --filter @expressots/cache test
pnpm --filter @expressots/cache lint
# Packed fresh app and example 10 (build prerequisites first):
pnpm --filter @expressots/adapter-express... --filter @expressots/cli... --filter @expressots/cache... build
CACHE_TEST_REDIS_URL=redis://127.0.0.1:6379 node packages/cache/test/install-smoke.mjs
```

Tests use unique namespaces and clear only their own keys. Without the Redis URL,
the suite explicitly reports that Redis conformance was not run; an invalid URL
fails tests. CI supplies a real Redis service and always runs both drivers.
Memory expiry tests use an injected clock / mocked Date.now, and Redis expiry
tests poll an expiration condition with a bounded deadline.

The package is based on the checked-in `templates/provider` scaffold rather than
`ex create`'s remote template (the CLI fetches `expressots/templates` at a release
tag, not this checkout). Workspace/release integration uses packages/* and a
changeset. See `test/install-smoke.mjs` for the packed, isolated local-registry
`ex new` / `ex add @expressots/cache` acceptance workflow. That is unpublished
artifact validation, not proof of public-registry availability after release.
