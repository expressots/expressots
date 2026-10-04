import { randomUUID } from "node:crypto";
import { provideSingleton } from "@expressots/core";
import type {
  IProvider,
  IConfigurable,
  ConfigurationResult,
  IBootstrap,
  IShutdown,
} from "@expressots/core";
import type { JWTVerifyGetKey, JWTPayload } from "jose" with {
  "resolution-mode": "import",
};
import { configuration, loadKey, RESERVED, validate } from "./config.js";
import { JwtError } from "./errors.js";
import type {
  JwtConfig,
  JwtAlgorithm,
  VerifiedClaims,
  RefreshClaims,
  RefreshRecord,
  RefreshStore,
  TokenPair,
} from "./types.js";

type LoadedKey = CryptoKey | Uint8Array;
@provideSingleton(JwtProvider, "external")
export class JwtProvider
  implements IProvider, IConfigurable<JwtConfig>, IBootstrap, IShutdown
{
  readonly name = "JwtProvider";
  readonly version = "4.3.0";
  readonly description = "JWT validation and refresh-token rotation";
  readonly author = "ExpressoTS Team";
  readonly repo = "https://github.com/expressots/expressots";
  private config?: JwtConfig;
  private state: "new" | "starting" | "ready" | "stopped" = "new";
  private initialization?: Promise<void>;
  private signingKey?: LoadedKey;
  private verification: Array<{
    algorithm: JwtAlgorithm;
    kid?: string;
    key: LoadedKey;
  }> = [];
  private remote?: JWTVerifyGetKey;

  configure(input: JwtConfig): ConfigurationResult {
    if (this.state !== "new")
      return {
        valid: false,
        errors: ["JWT configuration is locked after initialization starts"],
      };
    try {
      const config = configuration(input);
      const errors = validate(config);
      if (errors.length) return { valid: false, errors };
      // Snapshot nested configuration; the store and clock remain application-owned.
      this.config = {
        ...config,
        algorithms: [...(config.algorithms ?? [])],
        signing: config.signing ? structuredClone(config.signing) : undefined,
        verificationKeys: config.verificationKeys
          ? structuredClone(config.verificationKeys)
          : undefined,
        jwks: config.jwks ? { ...config.jwks } : undefined,
      };
      return { valid: true };
    } catch {
      return { valid: false, errors: ["Invalid JWT configuration"] };
    }
  }
  async bootstrap(): Promise<void> {
    if (this.state === "ready") return;
    if (this.state === "stopped") throw new JwtError("JWT_CONFIGURATION");
    if (this.initialization) return this.initialization;
    if (!this.config && !this.configure({}).valid)
      throw new JwtError("JWT_CONFIGURATION");
    this.state = "starting";
    this.initialization = this.initialize()
      .catch(() => {
        if (this.state === "starting") this.state = "new";
        throw new JwtError("JWT_CONFIGURATION");
      })
      .finally(() => {
        this.initialization = undefined;
      });
    return this.initialization;
  }
  private async initialize(): Promise<void> {
    const config = this.settings();
    const jose = await import("jose");
    const importKey = async (
      source: Parameters<typeof loadKey>[0],
      algorithm: JwtAlgorithm,
      signing: boolean,
    ): Promise<LoadedKey> => {
      const loaded = await loadKey(source, algorithm, signing);
      return typeof loaded !== "string"
        ? loaded
        : signing
          ? jose.importPKCS8(loaded, algorithm)
          : jose.importSPKI(loaded, algorithm);
    };
    const signingKey = config.signing
      ? await importKey(config.signing.key, config.signing.algorithm, true)
      : undefined;
    const verification: typeof this.verification = [];
    for (const key of config.verificationKeys ?? [])
      verification.push({
        ...key,
        key: await importKey(key.key, key.algorithm, false),
      });
    // A signing-only configuration verifies locally with its corresponding public key.
    if (!verification.length && !config.jwks && config.signing)
      verification.push({
        ...config.signing,
        key: await importKey(
          config.signing.key,
          config.signing.algorithm,
          false,
        ),
      });
    const remote = config.jwks
      ? jose.createRemoteJWKSet(new URL(config.jwks.url), {
          timeoutDuration: config.jwks.timeoutMs ?? 2000,
          cacheMaxAge: config.jwks.cacheMaxAgeMs ?? 600000,
          cooldownDuration: config.jwks.cooldownMs ?? 30000,
        })
      : undefined;
    if (this.state === "stopped") return;
    this.signingKey = signingKey;
    this.verification = verification;
    this.remote = remote;
    this.state = "ready";
  }
  async shutdown(): Promise<void> {
    this.state = "stopped";
    await this.initialization?.catch(() => undefined);
    this.signingKey = undefined;
    this.verification = [];
    this.remote = undefined;
    this.config = undefined;
  }
  private settings(): JwtConfig {
    if (!this.config) throw new JwtError("JWT_CONFIGURATION");
    return this.config;
  }
  private ready(): JwtConfig {
    if (this.state !== "ready") throw new JwtError("JWT_CONFIGURATION");
    return this.settings();
  }
  private now(): number {
    const n = Math.floor((this.settings().clock ?? Date.now)() / 1000);
    if (!Number.isSafeInteger(n) || n < 0)
      throw new JwtError("JWT_CONFIGURATION");
    return n;
  }
  private custom(claims: Record<string, unknown>): Record<string, unknown> {
    if (
      !claims ||
      Object.getPrototypeOf(claims) !== Object.prototype ||
      Object.keys(claims).some((k) => RESERVED.has(k))
    )
      throw new JwtError("JWT_INVALID");
    try {
      // JSON-only input; reject values that JSON would silently change or discard.
      const json = JSON.stringify(claims, (_key, value: unknown) => {
        if (
          value === undefined ||
          typeof value === "function" ||
          typeof value === "symbol" ||
          typeof value === "bigint" ||
          (typeof value === "number" && !Number.isFinite(value))
        )
          throw new Error();
        return value;
      });
      const copy = JSON.parse(json) as Record<string, unknown>;
      this.authorizationClaims(copy);
      return copy;
    } catch {
      throw new JwtError("JWT_INVALID");
    }
  }
  authorizationClaims(claims: JWTPayload): {
    roles: Array<string>;
    permissions: Array<string>;
  } {
    const config = this.ready();
    const list = (name: string): Array<string> => {
      if (!Object.prototype.hasOwnProperty.call(claims, name)) return [];
      const value = claims[name];
      if (value === undefined) return [];
      if (
        !Array.isArray(value) ||
        value.some((v) => typeof v !== "string" || !v.trim())
      )
        throw new JwtError("JWT_INVALID");
      return [...new Set(value)] as Array<string>;
    };
    return {
      roles: list(config.rolesClaim ?? "roles"),
      permissions: list(config.permissionsClaim ?? "permissions"),
    };
  }
  private async sign(
    subject: string,
    custom: Record<string, unknown>,
    purpose: "access" | "refresh",
    expiry: number,
    extra: JWTPayload = {},
  ): Promise<string> {
    const config = this.ready();
    if (typeof subject !== "string" || !subject.trim())
      throw new JwtError("JWT_INVALID");
    if (!config.signing || !this.signingKey)
      throw new JwtError("JWT_CONFIGURATION");
    const { SignJWT } = await import("jose");
    return new SignJWT({ ...custom, ...extra, token_use: purpose })
      .setProtectedHeader({
        alg: config.signing.algorithm,
        typ: "JWT",
        ...(config.signing.kid ? { kid: config.signing.kid } : {}),
      })
      .setSubject(subject)
      .setIssuer(config.issuer as string)
      .setAudience(config.audience as string)
      .setIssuedAt(this.now())
      .setExpirationTime(expiry)
      .sign(this.signingKey);
  }
  async signAccessToken(
    subject: string,
    claims: Record<string, unknown> = {},
  ): Promise<string> {
    const config = this.ready();
    return this.sign(
      subject,
      this.custom(claims),
      "access",
      this.now() + (config.accessTtlSeconds as number),
    );
  }
  private async verify(
    token: string,
    purpose: "access" | "refresh",
    allowExpiredForReplay = false,
  ): Promise<VerifiedClaims> {
    const config = this.ready();
    try {
      if (typeof token !== "string" || token.length > 65536) throw new Error();
      const { jwtVerify, errors } = await import("jose");
      const resolver: JWTVerifyGetKey = async (header, jwt) => {
        if (!config.algorithms?.includes(header.alg as JwtAlgorithm))
          throw new Error();
        if (this.remote) {
          if (typeof header.kid !== "string" || !header.kid) throw new Error();
          return this.remote(header, jwt);
        }
        const keys = this.verification.filter(
          (k) => k.algorithm === header.alg && k.kid === header.kid,
        );
        if (keys.length !== 1) throw new Error();
        return keys[0].key;
      };
      let payload: JWTPayload;
      try {
        ({ payload } = await jwtVerify(token, resolver, {
          algorithms: config.algorithms,
          issuer: config.issuer,
          audience: config.audience,
          requiredClaims: ["exp", "sub", "token_use"],
          clockTolerance: config.clockToleranceSeconds,
          currentDate: new Date(this.now() * 1000),
        }));
      } catch (error) {
        // jwtVerify authenticates before reporting expiry. This private path
        // permits only a replay lookup, never authentication or token issuance.
        if (
          !allowExpiredForReplay ||
          purpose !== "refresh" ||
          !(error instanceof errors.JWTExpired) ||
          error.claim !== "exp"
        )
          throw error;
        payload = error.payload;
      }
      if (
        typeof payload.sub !== "string" ||
        !payload.sub.trim() ||
        payload.token_use !== purpose ||
        payload.iss !== config.issuer ||
        typeof payload.exp !== "number" ||
        !(typeof payload.aud === "string"
          ? payload.aud === config.audience
          : Array.isArray(payload.aud) &&
            payload.aud.includes(config.audience as string))
      )
        throw new Error();
      for (const name of ["exp", "nbf", "iat"] as const)
        if (
          payload[name] !== undefined &&
          (!Number.isSafeInteger(payload[name]) ||
            (payload[name] as number) < 0)
        )
          throw new Error();
      // An expiration error may precede other claim validation in JOSE.
      if (
        payload.nbf !== undefined &&
        payload.nbf > this.now() + (config.clockToleranceSeconds ?? 0)
      )
        throw new Error();
      if (
        payload.jti !== undefined &&
        (typeof payload.jti !== "string" || !payload.jti.trim())
      )
        throw new Error();
      if (
        !(typeof payload.aud === "string" && payload.aud.trim()) &&
        !(
          Array.isArray(payload.aud) &&
          payload.aud.length > 0 &&
          payload.aud.every((a) => typeof a === "string" && a.trim())
        )
      )
        throw new Error();
      this.authorizationClaims(payload);
      return payload as VerifiedClaims;
    } catch (error) {
      const expired =
        error instanceof Error &&
        "code" in error &&
        error.code === "ERR_JWT_EXPIRED";
      throw new JwtError(expired ? "JWT_EXPIRED" : "JWT_INVALID");
    }
  }
  verifyAccessToken(token: string): Promise<VerifiedClaims> {
    return this.verify(token, "access");
  }
  async verifyRefreshToken(token: string): Promise<RefreshClaims> {
    return this.refreshClaims(token);
  }
  private async refreshClaims(
    token: string,
    allowExpiredForReplay = false,
  ): Promise<RefreshClaims> {
    const payload = await this.verify(token, "refresh", allowExpiredForReplay);
    if (
      typeof payload.jti !== "string" ||
      !payload.jti.trim() ||
      typeof payload.family !== "string" ||
      !payload.family.trim() ||
      !Number.isSafeInteger(payload.session_exp) ||
      (payload.session_exp as number) <= this.now() ||
      payload.exp > (payload.session_exp as number)
    )
      throw new JwtError("JWT_INVALID");
    return payload as RefreshClaims;
  }
  private store(): RefreshStore {
    const store = this.ready().refreshStore;
    if (!store) throw new JwtError("JWT_CONFIGURATION");
    return store;
  }
  private record(payload: RefreshClaims): RefreshRecord {
    const claims = Object.fromEntries(
      Object.entries(payload).filter(([k]) => !RESERVED.has(k)),
    );
    return {
      id: payload.jti,
      family: payload.family,
      subject: payload.sub,
      expiresAt: payload.exp,
      sessionExpiresAt: payload.session_exp,
      claims,
    };
  }
  private async pair(record: RefreshRecord): Promise<TokenPair> {
    return {
      accessToken: await this.sign(
        record.subject,
        record.claims,
        "access",
        Math.min(
          this.now() + (this.ready().accessTtlSeconds as number),
          record.sessionExpiresAt,
        ),
      ),
      refreshToken: await this.sign(
        record.subject,
        record.claims,
        "refresh",
        record.expiresAt,
        {
          jti: record.id,
          family: record.family,
          session_exp: record.sessionExpiresAt,
        },
      ),
    };
  }
  async issueTokens(
    subject: string,
    claims: Record<string, unknown> = {},
  ): Promise<TokenPair> {
    const config = this.ready();
    const store = this.store();
    const now = this.now();
    const record: RefreshRecord = {
      id: randomUUID(),
      family: randomUUID(),
      subject,
      expiresAt:
        now +
        Math.min(
          config.refreshTtlSeconds as number,
          config.sessionTtlSeconds as number,
        ),
      sessionExpiresAt: now + (config.sessionTtlSeconds as number),
      claims: this.custom(claims),
    };
    const pair = await this.pair(record);
    await store.create(record, now);
    return pair;
  }
  async rotateRefreshToken(token: string): Promise<TokenPair> {
    const previous = this.record(await this.refreshClaims(token, true));
    const config = this.ready();
    const now = this.now();
    if (previous.expiresAt <= now) {
      // Stores check consumed state before individual expiry. Passing the same
      // record cannot insert a successor; expired active records remain invalid.
      const result = await this.store().consume(previous, previous, now);
      throw new JwtError(result === "replay" ? "JWT_REPLAY" : "JWT_EXPIRED");
    }
    const successor: RefreshRecord = {
      ...previous,
      id: randomUUID(),
      expiresAt: Math.min(
        now + (config.refreshTtlSeconds as number),
        previous.sessionExpiresAt,
      ),
    };
    const pair = await this.pair(successor);
    const result = await this.store().consume(previous, successor, now);
    if (result !== "rotated")
      throw new JwtError(result === "replay" ? "JWT_REPLAY" : "JWT_INVALID");
    return pair;
  }
  async revokeRefreshSession(token: string): Promise<void> {
    const claims = await this.verifyRefreshToken(token);
    await this.store().revokeFamily(claims.family, this.now());
  }
}
