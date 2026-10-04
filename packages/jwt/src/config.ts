import { readFile } from "node:fs/promises";
import { createPrivateKey, createPublicKey } from "node:crypto";
import type { JwtConfig, JwtAlgorithm, KeySource } from "./types.js";

export const RESERVED = new Set([
  "iss",
  "aud",
  "sub",
  "exp",
  "nbf",
  "iat",
  "jti",
  "token_use",
  "family",
  "session_exp",
  "id",
]);
export function configuration(input: JwtConfig): JwtConfig {
  const env = process.env;
  const algorithm = (env.JWT_ALGORITHM ?? "HS256") as JwtAlgorithm;
  const envSource = (value?: string, file?: string): KeySource | undefined =>
    file ? { file } : value ? { value } : undefined;
  const signingKey = envSource(
    algorithm === "HS256" ? env.JWT_SECRET : env.JWT_PRIVATE_KEY,
    algorithm === "HS256" ? env.JWT_SECRET_FILE : env.JWT_PRIVATE_KEY_FILE,
  );
  const publicKey = envSource(env.JWT_PUBLIC_KEY, env.JWT_PUBLIC_KEY_FILE);
  return {
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    algorithms: [algorithm],
    signing: signingKey
      ? { algorithm, key: signingKey, kid: env.JWT_KEY_ID }
      : undefined,
    verificationKeys: publicKey
      ? [{ algorithm, key: publicKey, kid: env.JWT_KEY_ID }]
      : undefined,
    jwks: env.JWT_JWKS_URL ? { url: env.JWT_JWKS_URL } : undefined,
    accessTtlSeconds:
      env.JWT_ACCESS_TTL_SECONDS === undefined
        ? 900
        : Number(env.JWT_ACCESS_TTL_SECONDS),
    refreshTtlSeconds:
      env.JWT_REFRESH_TTL_SECONDS === undefined
        ? 604800
        : Number(env.JWT_REFRESH_TTL_SECONDS),
    sessionTtlSeconds:
      env.JWT_SESSION_TTL_SECONDS === undefined
        ? 2592000
        : Number(env.JWT_SESSION_TTL_SECONDS),
    clockToleranceSeconds: 0,
    rolesClaim: "roles",
    permissionsClaim: "permissions",
    clock: Date.now,
    ...input,
  };
}
export function validate(config: JwtConfig): Array<string> {
  const errors: Array<string> = [];
  const nonempty = (v: unknown): v is string =>
    typeof v === "string" && v.trim().length > 0;
  if (!nonempty(config.issuer)) errors.push("issuer is required");
  if (!nonempty(config.audience)) errors.push("audience is required");
  const allowed = config.algorithms;
  if (
    !Array.isArray(allowed) ||
    !allowed.length ||
    new Set(allowed).size !== allowed.length ||
    allowed.some((a) => !["HS256", "RS256", "ES256"].includes(a))
  )
    errors.push("algorithms must contain unique supported algorithms");
  for (const name of [
    "accessTtlSeconds",
    "refreshTtlSeconds",
    "sessionTtlSeconds",
  ] as const) {
    const n = config[name];
    if (!Number.isSafeInteger(n) || (n ?? 0) <= 0 || (n ?? Infinity) > 31536000)
      errors.push(`${name} must be positive integer seconds, at most one year`);
  }
  if (
    !Number.isInteger(config.clockToleranceSeconds) ||
    (config.clockToleranceSeconds ?? -1) < 0 ||
    (config.clockToleranceSeconds ?? Infinity) > 60
  )
    errors.push("clockToleranceSeconds must be between 0 and 60");
  for (const name of ["rolesClaim", "permissionsClaim"] as const)
    if (!nonempty(config[name]) || RESERVED.has(config[name] ?? ""))
      errors.push(`${name} must be a non-reserved claim name`);
  if (config.rolesClaim === config.permissionsClaim)
    errors.push("roles and permissions mappings must differ");
  if (typeof config.clock !== "function")
    errors.push("clock must be a function");
  if (
    config.refreshStore &&
    ["create", "consume", "revokeFamily"].some(
      (k) =>
        typeof (config.refreshStore as unknown as Record<string, unknown>)[
          k
        ] !== "function",
    )
  )
    errors.push("refreshStore must implement the atomic store contract");
  if (!config.signing && !config.verificationKeys?.length && !config.jwks)
    errors.push("signing or verification keys are required");
  if (
    config.verificationKeys &&
    (!Array.isArray(config.verificationKeys) || !config.verificationKeys.length)
  )
    errors.push("verificationKeys must be non-empty");
  const keys = [
    ...(config.verificationKeys ?? []),
    ...(config.signing ? [config.signing] : []),
  ];
  for (const key of keys) {
    if (!key || !allowed?.includes(key.algorithm)) {
      errors.push("key algorithm must be explicitly allowed");
      continue;
    }
    if (
      !key.key ||
      (typeof key.key.value === "string") ===
        (typeof key.key.file === "string") ||
      !nonempty(key.key.value ?? key.key.file)
    )
      errors.push("each key needs exactly one value or file");
    if (key.kid !== undefined && !nonempty(key.kid))
      errors.push("kid must be non-empty");
    if (
      key.algorithm === "HS256" &&
      key.key?.value !== undefined &&
      (Buffer.byteLength(key.key.value) < 32 ||
        /-----BEGIN/.test(key.key.value))
    )
      errors.push(
        "HS256 requires a secret of at least 32 bytes, never a PEM key",
      );
  }
  const selectors = (config.verificationKeys ?? []).map(
    (k) => `${k.algorithm}:${k.kid ?? ""}`,
  );
  if (new Set(selectors).size !== selectors.length)
    errors.push("verification key selection is ambiguous");
  if (config.jwks) {
    try {
      const url = new URL(config.jwks.url);
      const local = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
      if (
        url.username ||
        url.password ||
        url.hash ||
        (url.protocol !== "https:" &&
          !(
            config.jwks.allowLocalHttp === true &&
            local &&
            url.protocol === "http:"
          ))
      )
        throw new Error();
    } catch {
      errors.push(
        "JWKS requires an HTTPS URL (HTTP loopback only with allowLocalHttp)",
      );
    }
    if (allowed?.includes("HS256") || config.verificationKeys?.length)
      errors.push(
        "JWKS requires exclusively asymmetric algorithms and no static verification keys",
      );
    for (const [key, fallback, max, min] of [
      ["timeoutMs", 2000, 10000, 1],
      ["cacheMaxAgeMs", 600000, 3600000, 1],
      ["cooldownMs", 30000, 300000, 0],
    ] as const) {
      const n = config.jwks[key] ?? fallback;
      if (!Number.isInteger(n) || n < min || n > max)
        errors.push(`JWKS ${key} is outside its bounded range`);
    }
  }
  return errors;
}
export async function loadKey(
  source: KeySource,
  algorithm: JwtAlgorithm,
  signing: boolean,
): Promise<string | Uint8Array> {
  const value =
    source.file !== undefined
      ? await readFile(source.file, "utf8")
      : source.value;
  if (algorithm === "HS256") {
    if (Buffer.byteLength(value) < 32 || /-----BEGIN/.test(value))
      throw new Error("Invalid HMAC key");
    return new TextEncoder().encode(value);
  }
  const pem = value.replace(/\\n/g, "\n");
  const key = signing ? createPrivateKey(pem) : createPublicKey(pem);
  if (
    algorithm === "RS256" &&
    (key.asymmetricKeyType !== "rsa" ||
      (key.asymmetricKeyDetails?.modulusLength ?? 0) < 2048)
  )
    throw new Error("Invalid RSA key");
  if (
    algorithm === "ES256" &&
    (key.asymmetricKeyType !== "ec" ||
      key.asymmetricKeyDetails?.namedCurve !== "prime256v1")
  )
    throw new Error("Invalid EC key");
  return signing
    ? key.export({ type: "pkcs8", format: "pem" }).toString()
    : key.export({ type: "spki", format: "pem" }).toString();
}
