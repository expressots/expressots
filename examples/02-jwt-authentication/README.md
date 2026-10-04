# JWT authentication and refresh rotation

Example 02 uses `@expressots/jwt`, the Express adapter and core authentication,
role and permission guards. Passwords are bcrypt hashed. The seeded
`demo@expressots.dev` / `password123` account is demonstration data only.

## Run

```sh
npm install
cp .env.example .env
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
# Put the generated value in JWT_SECRET in .env; never use it in production.
npm run dev
```

The JWT package must first be published, or installed using the monorepo packed-package
workflow. The JWT install smoke test exercises this example against local tarballs.
No package in this contribution has been published by the contributor.

`loadEnvSync()` reads the environment before bootstrap. Required JWT_ISSUER,
JWT_AUDIENCE and JWT_SECRET are in `.env.example`; the secret is deliberately blank.
The registered singleton JwtProvider is configured in `configureServices`; the
framework bootstraps and shuts it down. `MemoryRefreshStore` is explicitly selected
for demonstration. It loses state on restart and does not support multiple instances;
production requires a shared store with atomic consume/replay/revocation operations.

## Requests

```sh
curl -s http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@expressots.dev","password":"password123"}'
# Copy accessToken and refreshToken from the response:
export ACCESS_TOKEN='<accessToken>'
export REFRESH_TOKEN='<refreshToken>'
curl -i http://localhost:3000/api/users/me -H "Authorization: Bearer $ACCESS_TOKEN"
curl -i http://localhost:3000/api/users/admin -H "Authorization: Bearer $ACCESS_TOKEN"
# The user has profile:read permission; /me succeeds, /admin returns 403.
curl -s http://localhost:3000/api/auth/refresh \
  -H 'Content-Type: application/json' -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}"
# Save the successor refresh token. Reusing REFRESH_TOKEN now returns 401 and
# revokes the entire family, including that successor. Reauthenticate after replay.
curl -i http://localhost:3000/api/auth/refresh \
  -H 'Content-Type: application/json' -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}"
# To demonstrate logout, log in again, then send the new refresh token:
curl -i http://localhost:3000/api/auth/logout \
  -H 'Content-Type: application/json' -d '{"refreshToken":"<new-refreshToken>"}'
```

Registration: POST `/api/auth/register` with email/password creates an ordinary user.
Roles and permissions are assigned by the repository, never from request data. Public
login/refresh/logout routes use request bodies; do not attach stale Bearer headers.
JWT session middleware permits absent tokens on public routes, but rejects invalid
present tokens. `/users/me` uses session authentication plus RequireAuthentication
and RequirePermissions. `/users/admin` also exercises JwtAuthGuard and RequireRoles.

JWT signing and verification require issuer, audience, expiration and algorithm
allowlist; access and refresh token purposes are distinct. TTLs are seconds. Refresh
rotation never extends the original absolute session expiry. Logout/replay revokes
refresh state; previously issued access tokens remain valid until their own expiration.
Only Bearer headers are supported; no cookie transport is introduced.

## Verify

```sh
npm run build
NODE_OPTIONS=--experimental-vm-modules npm test
npm run lint
```

Tests cover login, protected identity, roles, permissions, request isolation, refresh
rotation/replay and logout. Package-level tests cover algorithms, claims, tampering,
JWKS, clocks, lifecycle and refresh concurrency. See `packages/jwt/README.md` for
RS256/ES256, key files, JWKS and production store requirements.
