# Framework and documentation issues found during v4 examples implementation

Tracked while building the [v4 example catalog](./CATALOG.md) against `@expressots/*@4.0.0-preview.3.4`.

## Framework issues

### F-1: `InMemoryDBProvider` cannot be injected via `Provider.register()`

**Severity:** High (blocks database guide pattern as written)

**Reproduction:** See [04-database-inmemory](./04-database-inmemory/). Calling `this.Provider.register(InMemoryDBProvider, Scope.Singleton)` then `@inject(InMemoryDBProvider)` fails at runtime:

```
Missing required @injectable annotation in: InMemoryDBProvider.
```

**Workaround:** Wrap with a `@provideSingleton` composition class (see `AppDatabaseProvider` in example 04).

**Expected:** Either `InMemoryDBProvider` should be `@injectable`, or the database integration guide should document the wrapper pattern explicitly.

---

### F-2: Guard factory instances do not inherit `@Guard` priority metadata

**Severity:** Medium

**Reproduction:** Stack `@RequireAuthentication()` and `@RequireRoles("admin")` on the same method (method level). Anonymous requests receive **403** instead of **401** because `RoleGuard` runs before `AuthenticatedGuard` when both instances lack `.priority`.

**Workaround:** Apply `@RequireAuthentication()` at **controller** class level; apply role/permission guards at method level. See [03-authorization-rbac](./03-authorization-rbac/).

**Expected:** Factory-created guard instances (`RequireAuth()`, `RequireRole()`) should copy priority from their guard class metadata.

---

### F-3: `@controller` must not be combined with `@provide` on the same class

**Severity:** Low (DX)

**Reproduction:** Decorating a controller with both `@provide(UserController)` and `@controller(...)` causes duplicate DI binding errors.

**Workaround:** Use `@controller` only; it registers the class in the container.

---

## Documentation drift

### D-1: `@principal()` is exported from `@expressots/adapter-express`, not `@expressots/core`

**Affected:** [Authentication guide](https://doc.expresso-ts.com/docs/guides/authentication), [Guards](https://doc.expresso-ts.com/docs/features/guards), [Decorators](https://doc.expresso-ts.com/docs/features/decorators)

**Fix:** Update imports to `import { principal } from "@expressots/adapter-express"`.

---

### D-2: `@expressots/provider-jwt` referenced but not published

**Affected:** [CLI providers docs](https://doc.expresso-ts.com/docs/cli/providers)

**Fix:** Remove or mark as "coming soon"; authentication guide already shows manual `AuthProvider` implementation.

---

### D-3: Database guide `Provider.register(InMemoryDBProvider)` snippet fails without wrapper

**Affected:** [Database integration guide](https://doc.expresso-ts.com/docs/guides/database-integration)

**Fix:** Align with example 04 wrapper pattern or fix F-1 in core.

---

## Example gaps (not framework bugs)

| Item | Notes |
| --- | --- |
| Postgres / Redis examples | Tests use in-memory fallbacks when services are unavailable; integration tests skip with `SKIP_DB=1` or `SKIP_DB=true` |

### F-4: Jest hangs after tests (`Jest did not exit one second after...`)

**Severity:** Medium (CI/local scripts using `npm test | tail` appear frozen)

**Cause:** `createTestApp` leaves HTTP server or provider handles open; Jest waits indefinitely.

**Workaround:** `forceExit: true` in `jest.config.ts` (applied to all v4 examples). Prefer proper `testApp.cleanup()` in `afterAll` long term.
| Prisma example | Requires `npx prisma generate` after install |
| Middleware preset warnings | `helmet`, `cors`, `compression`, `express-rate-limit` not installed by default (expected; preset warns) |

## Preview stability assessment

`4.0.0-preview.3.4` is **usable for examples and docs** with the workarounds above. No show-stopping crashes were found in the 15-example matrix once workarounds were applied. External-service examples degrade gracefully when Postgres/Redis are absent.
