# @expressots/jwt

First-party ExpressoTS JWT system plugin: HS256, RS256 and ES256; signed access tokens,
atomic refresh rotation, Express guards and JWT session middleware. Cryptography is
provided by [jose](https://github.com/panva/jose). Node >=20.19.0 is required (the
repository recommends Node 22). Both CommonJS and ESM entry points include declarations.
This package targets the Express adapter; other adapters/Workers are not verified.
Release this contribution with its core and Express adapter changes: previously
published 4.3.0 does not contain the JWT session hook. Packing rewrites workspace
peer ranges to the framework versions in that release.

## Installation and registration

```sh
ex add @expressots/jwt
# Equivalent package-manager installation:
npm install @expressots/jwt @expressots/core @expressots/adapter-express
```

`ex add` installs the package. It does not edit application modules or configure keys.
The provider uses `@provideSingleton(JwtProvider, "external")` metadata and the same
build structure as `templates/provider`. Register and inject it explicitly:

```ts
import {
  AppExpress,
  setupAuthorizationForExpress,
} from "@expressots/adapter-express";
import { AppContainer, CreateModule, inject } from "@expressots/core";
import { JwtProvider, MemoryRefreshStore } from "@expressots/jwt";

export class App extends AppExpress {
  private readonly container: AppContainer = this.configContainer([
    CreateModule([JwtProvider /*, your controllers and providers */]),
  ]);
  async configureServices(): Promise<void> {
    this.Middleware.setErrorHandler();
    const jwt = this.container.Container.get(JwtProvider);
    const result = jwt.configure({ refreshStore: new MemoryRefreshStore() });
    if (!result.valid) throw new Error(result.errors?.join("; "));
    setupAuthorizationForExpress(
      this.container.Container,
      { enablePreloading: false },
      this.Middleware,
    );
    this.Middleware.session({ type: "jwt" });
  }
}

// Controller/provider constructor:
// constructor(@inject(JwtProvider) private readonly jwt: JwtProvider) {}
```

The application lifecycle calls `bootstrap()` and `shutdown()`. For standalone use,
configure, await bootstrap, use the provider, then await shutdown. Operations before
bootstrap or after shutdown fail. Bootstrap is idempotent and shares concurrent
initialization; failed initialization permits correction/retry. Shutdown is terminal.
Configuration is locked once initialization starts; replace the instance to reconfigure.
The application owns the refresh store and its connection lifecycle.

## Environment and code configuration

Call `loadEnvSync()` from core before application bootstrap, as in example 02. The
provider reads `process.env`; it does not load dotenv itself. There is no development
secret fallback. Generate a random secret with at least 32 bytes of entropy:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

```dotenv
JWT_ALGORITHM=HS256
JWT_SECRET=<your-generated-secret>
JWT_ISSUER=https://auth.example.com
JWT_AUDIENCE=example-api
JWT_ACCESS_TTL_SECONDS=900
JWT_REFRESH_TTL_SECONDS=604800
JWT_SESSION_TTL_SECONDS=2592000
```

Code configuration overrides environment fields, which override defaults. Defaults:
HS256-only allowlist, access 900s, refresh 604800s, absolute session 2592000s, tolerance
0s, claim mappings `roles`/`permissions`. Issuer, audience and usable keys are required.
`configure()` returns `{ valid, errors? }`; always check it. Invalid configuration
leaves the previous valid configuration intact. Key parsing/type validation also runs
at bootstrap; unreadable files or incompatible keys fail startup without key material
in errors. All lifetimes are positive integer **seconds**, capped at one year;
clock tolerance is an integer from 0 to 60 seconds. The optional `clock` returns epoch
milliseconds for deterministic testing.

```ts
jwt.configure({
  issuer: "https://auth.example.com",
  audience: "example-api",
  algorithms: ["HS256"],
  signing: { algorithm: "HS256", key: { value: process.env.JWT_SECRET! } },
  accessTtlSeconds: 300,
  refreshTtlSeconds: 86400,
  sessionTtlSeconds: 604800,
  refreshStore: productionAtomicStore,
});
```

HS256 supports a UTF-8 secret value or file (`JWT_SECRET_FILE`). It rejects PEM keys
and secrets shorter than 32 bytes. Length cannot prove entropy: do not use passwords.

RS256 uses RSA >=2048 bits, ES256 uses EC P-256. Signing needs a private key; verification
uses a public key (or the public part of the configured private signing key). Input PEM
may use escaped `\n`, which is normalized. Node's PEM parser accepts compatible key
formats; keys are normalized to PKCS8 private / SPKI public for jose.

```ts
// RS256; change BOTH algorithms to ES256 and supply P-256 keys for ES256.
jwt.configure({
  issuer: "https://auth.example.com",
  audience: "example-api",
  algorithms: ["RS256"],
  signing: {
    algorithm: "RS256",
    kid: "2026-01",
    key: { file: "./keys/private.pem" },
  },
  verificationKeys: [
    { algorithm: "RS256", kid: "2026-01", key: { file: "./keys/public.pem" } },
  ],
});
```

Equivalent environment keys: `JWT_PRIVATE_KEY`, `JWT_PRIVATE_KEY_FILE`,
`JWT_PUBLIC_KEY`, `JWT_PUBLIC_KEY_FILE`, `JWT_KEY_ID`, with `JWT_ALGORITHM=RS256` or
`ES256`. File variables take precedence over the corresponding value variables.
Static verification keys must have unique algorithm/kid selectors; token kid must
match exactly (including absent kid). Public-key-only instances can verify but cannot
sign or issue refresh sessions.

## Remote JWKS verification

```ts
jwt.configure({
  issuer: "https://identity.example.com",
  audience: "example-api",
  algorithms: ["RS256", "ES256"],
  signing: undefined,
  jwks: {
    url: "https://identity.example.com/.well-known/jwks.json",
    timeoutMs: 2000,
    cacheMaxAgeMs: 600000,
    cooldownMs: 30000,
  },
});
```

`JWT_JWKS_URL` provides the URL for environment configuration. Public JWKS supplies
verification keys, never private signing keys. Configure signing separately if needed.
JWKS cannot be combined with HS256 or static verification keys. The configured URL
is an application-controlled trust boundary: HTTPS is required, credentials/fragments
are rejected. `allowLocalHttp: true` permits HTTP only on loopback for local tests.
No token-provided `jku`/`x5u` URL is fetched. jose caches keys and refreshes for a new
`kid` after cooldown; unknown/ambiguous keys and invalid signatures fail closed.
JWKS tokens require nonempty `kid`. Timeouts are 1–10000ms, cache age 1–3600000ms,
cooldown 0–300000ms. Defaults above bound network requests and refresh frequency.
Key rotation requires publishing the new public key before issuing its tokens; retain
old public keys for the remaining lifetime of legitimate tokens.

## Token operations and validation

```ts
const access = await jwt.signAccessToken("user-42", {
  roles: ["editor"],
  permissions: ["documents:read"],
  tenant: "tenant-a",
});
const claims = await jwt.verifyAccessToken(access);
console.log(claims.sub); // verified identity
const pair = await jwt.issueTokens("user-42", { roles: ["editor"] });
const successor = await jwt.rotateRefreshToken(pair.refreshToken);
await jwt.revokeRefreshSession(successor.refreshToken); // logout
```

Signature, configured algorithm, issuer, audience, nonempty subject and valid expiration
are mandatory. Optional `nbf` is always validated; signing does **not** emit it by default.
Numeric dates must be nonnegative safe integers. Malformed registered claims are
rejected. `none`, disallowed algorithms, wrong key types, unsigned and wrong-purpose
tokens are rejected. Static keys are bound to their algorithm; asymmetric keys cannot
be HMAC secrets. Access and refresh tokens use validated `token_use` claims; they are
not interchangeable. `verifyRefreshToken` validates cryptography/claims only; rotation
also checks store state. No unverified decode API is provided.

Custom claims use JSON serialization. Undefined, functions, symbols, BigInt, nonfinite
numbers and cycles are unsupported. Identity fields `id`, registered claims
`iss/aud/sub/exp/nbf/iat/jti` and provider fields `token_use/family/session_exp` cannot
be overridden. `rolesClaim` and `permissionsClaim` explicitly choose top-level claim
names; each mapped value must be an array of nonempty strings. Missing mappings mean
no roles/permissions; invalid shapes fail authentication. Application code must assign
privileges from trusted account data, not client input. JWTs are signed, not encrypted:
do not put secrets in claims.

`JwtError` extends core `AppError`: `JWT_CONFIGURATION` (500), `JWT_INVALID`,
`JWT_EXPIRED`, `JWT_REPLAY` (401). Messages never contain tokens, secrets, key material
or underlying JOSE/network errors. Refresh-store failures propagate as infrastructure
failures rather than successful rotation.

## Guards, roles and permissions

```ts
import { controller, Get, principal } from "@expressots/adapter-express";
import { UseGuards, RequireRoles, RequirePermissions } from "@expressots/core";
import { JwtAuthGuard, JwtPrincipal } from "@expressots/jwt";

@controller("/documents")
export class DocumentsController {
  @Get("/")
  @UseGuards(JwtAuthGuard)
  @RequireRoles("editor")
  @RequirePermissions("documents:read")
  list(@principal() user: JwtPrincipal) {
    return { subject: user.details.sub };
  }
}
```

Call `setupAuthorizationForExpress` as shown above. The stateless guard resolves the
provider from the request child container, runs at priority 0 (before authentication,
role and permission guards), verifies a strict Bearer Authorization header, and updates
the existing HttpContext principal. Its details include verified claims, `id = sub`,
and validated role/permission arrays. It installs a permission SecurityContext in
that request's child container, shared by subsequent resolutions. No identity is
stored in the guard or provider. Ownership uses subject equality. Existing guards
continue to make authorization decisions; the JWT provider does not add a policy engine.

## JWT sessions

`this.Middleware.session({ type: "jwt", jwt: { storage: "header" } })` resolves the
installed plugin and registered provider. Omit `jwt` for the same default. No session
secret is needed: all keys/policies belong on JwtProvider. `headerName` optionally
selects another lowercase HTTP header carrying the same Bearer scheme. Algorithm,
issuer, audience and expiresIn session overrides are rejected; configure the provider.
Cookie/both transport is rejected, so no cookie/CSRF transport is introduced.

Absent tokens leave public routes anonymous; protect routes with
`RequireAuthentication` plus role/permission guards. Present invalid tokens return 401,
including on public routes. Missing package/provider fails configuration with an
installation/registration instruction. Uninitialized/misconfigured provider never
establishes authentication. Guard and middleware share validation and context mapping.
Use the matching core/Express release containing the JWT session integration hook;
older 4.x versions only logged a warning for JWT sessions.

## Refresh store and replay

Refresh issuance requires an explicit `RefreshStore`. `MemoryRefreshStore` is an
example/test implementation: restart loses sessions, state is process-local, and it
is unsuitable for multiple server instances. Expired families are lazily removed on
store operations. Consumed identifiers are retained until absolute session expiry.
Capacity grows with issued sessions and rotations; production needs retention limits,
rate limiting and a shared transactional store.

The public contract stores identifiers, family, subject, token expiry, absolute session
expiry and custom claims, not raw refresh tokens. `create` inserts a unique family.
`consume(previous, successor, now)` must **atomically** check active state/subject/expiry,
mark the previous token consumed, and record the successor. Concurrent reuse has only
one winner. Replaying a consumed token must revoke the entire family in the same
transaction and return `replay`, even after that token expires while its absolute
session remains active. Check consumed state before individual token expiry;
unknown/expired active/revoked state returns `invalid`. An expiry replay lookup
passes the previous record itself as successor and must never insert it.
`revokeFamily` must atomically mark the family revoked. Store times are epoch seconds.
Production implementations must retain replay/revocation state until absolute session
expiry and must use database transactions, conditional updates or equivalent shared
atomic operations. Process-local locking does not provide distributed safety.

A successor expiry is the earlier of refresh lifetime and original absolute session
expiry. Rotation never extends the absolute session; newly issued access tokens are
also capped at it. Expired refresh tokens cannot rotate or authenticate. Rotation
authenticates their signature and other claims solely to detect consumed-token
replay until absolute session expiry. Malformed or unauthenticated tokens never
reach the store; public verification still rejects expired tokens.
Logout/replay revokes refresh sessions, **not previously issued stateless access tokens**;
those remain valid until their own expiration. The concurrent rotation winner's refresh
may already be revoked by the losing replay; reauthenticate in that case.

## Tests and example

From the repository root, build shared, core, Studio agent, Express adapter, then JWT:

```sh
pnpm --filter @expressots/shared build
pnpm --filter @expressots/core build
pnpm --filter @expressots/studio-agent build
pnpm --filter @expressots/adapter-express build
pnpm --filter @expressots/jwt build
pnpm --filter @expressots/cli build
pnpm --filter @expressots/jwt test
pnpm --filter @expressots/jwt lint
pnpm --filter @expressots/jwt test:install
```

Tests use real cryptographic verification, generated test-only keys, deterministic
JWT clocks and a controlled local JWKS HTTP server. No external identity service or
Redis is required. The install smoke test packs local framework packages, serves a
temporary read-only registry, runs actual `ex new`/`ex add`, builds/starts a protected
application and runs migrated example 02. Local unpublished-package verification does
not prove public npm installation; maintainers must publish and check that separately.

See [example 02](../../examples/02-jwt-authentication/README.md) for register/login,
protected routes, refresh, old-token rejection and logout. See [security review](SECURITY_REVIEW.md)
for the contribution's focused review and limitations; it is not an independent audit.
