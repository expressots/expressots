import type { JWTPayload } from "jose" with { "resolution-mode": "import" };

export type JwtAlgorithm = "HS256" | "RS256" | "ES256";
export type KeySource =
  { value: string; file?: never } | { file: string; value?: never };
export interface VerificationKey {
  algorithm: JwtAlgorithm;
  key: KeySource;
  kid?: string;
}
export interface JwtConfig {
  issuer?: string;
  audience?: string;
  algorithms?: Array<JwtAlgorithm>;
  signing?: VerificationKey;
  verificationKeys?: Array<VerificationKey>;
  jwks?: {
    url: string;
    timeoutMs?: number;
    cacheMaxAgeMs?: number;
    cooldownMs?: number;
    /** Only permit HTTP on loopback hosts, for local tests. */
    allowLocalHttp?: boolean;
  };
  accessTtlSeconds?: number;
  refreshTtlSeconds?: number;
  sessionTtlSeconds?: number;
  clockToleranceSeconds?: number;
  rolesClaim?: string;
  permissionsClaim?: string;
  refreshStore?: RefreshStore;
  /** Test/application clock in milliseconds; defaults to Date.now. */
  clock?: () => number;
}
export interface VerifiedClaims extends JWTPayload {
  sub: string;
  exp: number;
  token_use: "access" | "refresh";
}
export interface RefreshClaims extends VerifiedClaims {
  token_use: "refresh";
  jti: string;
  family: string;
  session_exp: number;
}
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
export interface RefreshRecord {
  id: string;
  family: string;
  subject: string;
  expiresAt: number;
  sessionExpiresAt: number;
  claims: Record<string, unknown>;
}
export type RotationResult = "rotated" | "replay" | "invalid";
/** All times are epoch seconds. No raw tokens are stored.
 * consume MUST atomically validate the active record, consume it and insert its
 * successor. Reuse MUST revoke the family in that same transaction. Retain consumed
 * identifiers and revoked state until absolute session expiry. Store failures reject.
 * Check consumed state before individual token expiry: an expired consumed token
 * still revokes its active family. Expired active records MUST NOT rotate; replay
 * lookups may pass the previous record itself as successor and never insert it.
 */
export interface RefreshStore {
  create(record: RefreshRecord, now: number): Promise<void>;
  consume(
    previous: RefreshRecord,
    successor: RefreshRecord,
    now: number,
  ): Promise<RotationResult>;
  revokeFamily(family: string, now: number): Promise<void>;
}
