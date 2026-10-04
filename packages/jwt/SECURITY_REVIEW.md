# Focused contribution security review

This is a contributor review, not an independent security audit. Guidance:
[RFC 8725](https://www.rfc-editor.org/rfc/rfc8725.html), especially algorithm/key binding,
issuer/audience validation and mutually exclusive token validation rules;
[jose jwtVerify](https://github.com/panva/jose/blob/main/docs/jwt/verify/functions/jwtVerify.md)
and [remote JWKS options](https://github.com/panva/jose/blob/main/docs/jwks/remote/interfaces/RemoteJWKSetOptions.md).

Reviewed trust boundaries and corresponding runnable checks:

- Header algorithms must be configured before key selection; each static key is bound
  to its algorithm. PEM cannot become an HMAC secret. RSA modulus and EC curve are
  checked at key import. Provider tests reject none, HS384 and RSA/HMAC confusion.
- Signature, issuer, audience, required exp/nonempty sub and purpose are verified.
  nbf is optional but validated whenever present; malformed NumericDates/jti and
  mapped authorization fields fail. Tests cover tampering, wrong issuer/audience,
  absent/expired exp, future nbf, tolerance and access/refresh substitution.
- Reserved claims cannot be replaced by custom claims. Roles and permissions are
  explicitly mapped arrays and derived solely from verified claims. Integration tests
  combine JWT authentication with existing role/permission guards.
- JWKS trusts only the configured URL; HTTPS except explicit loopback tests, bounded
  timeout/cache/cooldown, kid rotation, unknown/ambiguous key rejection. Token jku/x5u
  are never used. A controlled local server exercises these paths and a stalled request.
- Refresh records contain identifiers rather than raw tokens. Consumption and successor
  insertion are synchronous atomic mutations in the single-process store. Concurrent
  replay revokes the family. Tests exercise concurrency, replay, revocation and the
  absolute session cap. Shared production stores require equivalent transactions.
  Expired consumed tokens remain replay evidence until absolute session expiry:
  the private rotation path uses only signature-authenticated expiry errors, checks
  the remaining claims, then consults consumed state without issuing tokens. Tests
  cover the +75s rotation/+101s replay regression and invalid-token store isolation.
- Authentication guards contain no request state. The request HttpContext principal and
  child-container SecurityContext receive verified identity/permissions. Tests perform
  authorized, unauthorized and anonymous requests sequentially to detect leakage.
- Token/key/network errors are replaced by generic AppError messages with stable codes.
  No provider logging includes keys, credentials or tokens. File/key failures fail startup.
  Concurrent bootstrap callers share the sanitized initialization promise. A missing-file
  regression verifies identical JWT_CONFIGURATION errors without the file path in their
  message, stack or serialized fields, followed by configuration correction and retry.
- Core changes are limited to optional provider middleware resolution, JWT session
  typing and forwarding the existing application container. GuardRegistry also applies
  decorator priorities to convenience instances, so authentication precedes permissions.
  Core has no JOSE dependency.

Limits: no immediate revocation of stateless access tokens, no distributed store supplied,
no cookies/CSRF transport, no other adapter/Worker claim, no independent audit. In-memory
state is lost on restart and grows with active sessions/rotations until lazy expiry.
Applications must use high-entropy keys, protect private files, assign claims from trusted
account data and rate-limit login/refresh/JWKS-sensitive routes. JWKS endpoints are an
application-controlled trust boundary; HTTPS alone does not authorize an endpoint.
