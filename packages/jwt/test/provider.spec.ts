import { describe, it, expect, beforeAll, afterAll, jest } from "@jest/globals";
import { generateKeyPairSync } from "node:crypto";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SignJWT } from "jose";
import { JwtProvider, JwtError, MemoryRefreshStore } from "../src/index.js";
import type { JwtConfig, JwtAlgorithm } from "../src/index.js";

const secret = "test-only-secret-with-at-least-32-bytes!";
const seconds = 2000000000;
const base: JwtConfig = {
  issuer: "test-issuer",
  audience: "test-api",
  algorithms: ["HS256"],
  signing: { algorithm: "HS256", key: { value: secret } },
  clock: () => seconds * 1000,
};
async function provider(config: JwtConfig = {}): Promise<JwtProvider> {
  const p = new JwtProvider();
  expect(p.configure({ ...base, ...config })).toEqual({ valid: true });
  await p.bootstrap();
  return p;
}
async function raw(
  payload: Record<string, unknown> = {},
  algorithm = "HS256",
  signingKey: Uint8Array | CryptoKey = new TextEncoder().encode(secret),
): Promise<string> {
  return new SignJWT({
    iss: "test-issuer",
    aud: "test-api",
    sub: "user-1",
    exp: seconds + 60,
    token_use: "access",
    ...payload,
  })
    .setProtectedHeader({ alg: algorithm })
    .sign(signingKey);
}
const keys: Record<string, { privateKey: string; publicKey: string }> = {};
beforeAll(() => {
  for (const algorithm of ["RS256", "ES256"]) {
    const pair =
      algorithm === "RS256"
        ? generateKeyPairSync("rsa", { modulusLength: 2048 })
        : generateKeyPairSync("ec", { namedCurve: "prime256v1" });
    keys[algorithm] = {
      privateKey: pair.privateKey
        .export({ format: "pem", type: "pkcs8" })
        .toString(),
      publicKey: pair.publicKey
        .export({ format: "pem", type: "spki" })
        .toString(),
    };
  }
});

describe("signing and secure validation", () => {
  it.each(["HS256", "RS256", "ES256"] as Array<JwtAlgorithm>)(
    "signs and verifies %s",
    async (algorithm) => {
      const p = await provider({
        algorithms: [algorithm],
        signing: {
          algorithm,
          key: {
            value: algorithm === "HS256" ? secret : keys[algorithm].privateKey,
          },
        },
      });
      const token = await p.signAccessToken("user-1", {
        roles: ["admin"],
        permissions: ["profile:read"],
        email: "test@example.invalid",
      });
      const claims = await p.verifyAccessToken(token);
      expect(claims).toMatchObject({
        sub: "user-1",
        exp: seconds + 900,
        token_use: "access",
        roles: ["admin"],
        email: "test@example.invalid",
      });
      expect(claims.nbf).toBeUndefined();
      await p.shutdown();
    },
  );
  it.each([
    ["wrong issuer", { iss: "wrong" }],
    ["wrong audience", { aud: "wrong" }],
    ["missing expiration", { exp: undefined }],
    ["expired", { exp: seconds - 1 }],
    ["future nbf", { nbf: seconds + 1 }],
    ["malformed nbf", { nbf: "tomorrow" }],
    ["malformed iat", { iat: "yesterday" }],
    ["malformed jti", { jti: [] }],
    ["fractional exp", { exp: seconds + 0.5 }],
    ["malformed exp", { exp: "later" }],
    ["empty subject", { sub: " " }],
    ["malformed subject", { sub: [] }],
    ["wrong purpose", { token_use: "refresh" }],
    ["missing purpose", { token_use: undefined }],
    ["malformed roles", { roles: "admin" }],
    ["malformed permissions", { permissions: [123] }],
    ["empty role", { roles: [""] }],
    ["malformed issuer", { iss: 1 }],
    ["malformed audience", { aud: 1 }],
    ["mixed audience", { aud: ["test-api", 1] }],
  ])("rejects %s", async (_label, claims) => {
    const p = await provider();
    await expect(
      p.verifyAccessToken(await raw(claims as Record<string, unknown>)),
    ).rejects.toBeInstanceOf(JwtError);
  });
  it("rejects tampering, bad signatures, none and disallowed algorithms", async () => {
    const p = await provider();
    const token = await p.signAccessToken("u1");
    const parts = token.split(".");
    parts[1] = Buffer.from(JSON.stringify({ sub: "attacker" })).toString(
      "base64url",
    );
    for (const invalid of [
      parts.join("."),
      await raw(
        {},
        "HS256",
        new TextEncoder().encode("different-secret-different-secret!"),
      ),
      `${Buffer.from('{"alg":"none"}').toString("base64url")}.${token.split(".")[1]}.`,
      await raw({}, "HS384", new TextEncoder().encode(secret.repeat(2))),
      "garbage",
    ])
      await expect(p.verifyAccessToken(invalid)).rejects.toBeInstanceOf(
        JwtError,
      );
  });
  it("prevents RSA-public-key HMAC confusion", async () => {
    const p = await provider({
      algorithms: ["RS256"],
      signing: undefined,
      verificationKeys: [
        { algorithm: "RS256", key: { value: keys.RS256.publicKey } },
      ],
    });
    await expect(
      p.verifyAccessToken(
        await raw({}, "HS256", new TextEncoder().encode(keys.RS256.publicKey)),
      ),
    ).rejects.toBeInstanceOf(JwtError);
    expect(
      new JwtProvider().configure({
        ...base,
        signing: { algorithm: "HS256", key: { value: keys.RS256.publicKey } },
      }).valid,
    ).toBe(false);
  });
  it("uses bounded tolerance and validates optional nbf", async () => {
    const p = await provider({ clockToleranceSeconds: 5 });
    await expect(
      p.verifyAccessToken(await raw({ nbf: seconds + 5 })),
    ).resolves.toMatchObject({ sub: "user-1" });
    await expect(
      p.verifyAccessToken(await raw({ nbf: seconds + 6 })),
    ).rejects.toBeInstanceOf(JwtError);
    await expect(
      p.verifyAccessToken(await raw({ exp: seconds - 5 })),
    ).rejects.toBeInstanceOf(JwtError);
  });
  it.each([
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
  ])("protects reserved %s", async (claim) => {
    const p = await provider();
    await expect(
      p.signAccessToken("u", { [claim]: "override" }),
    ).rejects.toBeInstanceOf(JwtError);
  });
  it("maps explicit custom authorization claims and preserves falsy claims", async () => {
    const p = await provider({
      rolesClaim: "groups",
      permissionsClaim: "grants",
    });
    const claims = await p.verifyAccessToken(
      await p.signAccessToken("u", {
        groups: ["admin"],
        grants: ["read"],
        roles: ["untrusted-mapping"],
        enabled: false,
        count: 0,
        note: "",
        nullable: null,
      }),
    );
    expect(p.authorizationClaims(claims)).toEqual({
      roles: ["admin"],
      permissions: ["read"],
    });
    expect(claims).toMatchObject({
      enabled: false,
      count: 0,
      note: "",
      nullable: null,
    });
    expect(p.authorizationClaims({})).toEqual({ roles: [], permissions: [] });
  });
  it("rejects undefined and non-JSON custom values", async () => {
    const p = await provider();
    for (const value of [undefined, NaN, Infinity, 1n, () => 1])
      await expect(p.signAccessToken("u", { value })).rejects.toBeInstanceOf(
        JwtError,
      );
  });
});

describe("configuration and lifecycle", () => {
  it.each([
    { issuer: "" },
    { audience: "" },
    { algorithms: ["none"] },
    { clockToleranceSeconds: 61 },
    { accessTtlSeconds: 0 },
    { refreshTtlSeconds: -1 },
    { sessionTtlSeconds: Infinity },
    { signing: { algorithm: "HS256", key: { value: "short" } } },
    { rolesClaim: "sub" },
    { jwks: { url: "http://example.com/keys" } },
  ])("rejects invalid config %j", (input) => {
    expect(
      new JwtProvider().configure({ ...base, ...input } as JwtConfig).valid,
    ).toBe(false);
  });
  it("does not mutate existing valid config after invalid configure", async () => {
    const p = new JwtProvider();
    expect(p.configure(base).valid).toBe(true);
    expect(p.configure({ issuer: "" }).valid).toBe(false);
    await p.bootstrap();
    await expect(p.signAccessToken("u")).resolves.toEqual(expect.any(String));
  });
  it("locks configuration and rejects operations outside readiness", async () => {
    const p = new JwtProvider();
    await expect(p.signAccessToken("u")).rejects.toBeInstanceOf(JwtError);
    p.configure(base);
    await Promise.all([p.bootstrap(), p.bootstrap()]);
    expect(p.configure(base).valid).toBe(false);
    await p.shutdown();
    await p.shutdown();
    await expect(p.verifyAccessToken("token")).rejects.toBeInstanceOf(JwtError);
    await expect(p.bootstrap()).rejects.toBeInstanceOf(JwtError);
  });
  it("supports environment keys with code precedence", async () => {
    const saved = { ...process.env };
    try {
      Object.assign(process.env, {
        JWT_ISSUER: "env-issuer",
        JWT_AUDIENCE: "env-api",
        JWT_SECRET: secret,
        JWT_ALGORITHM: "HS256",
      });
      const p = new JwtProvider();
      expect(p.configure({ issuer: "code-issuer" }).valid).toBe(true);
      await p.bootstrap();
      expect(
        await p.verifyAccessToken(await p.signAccessToken("u")),
      ).toMatchObject({ iss: "code-issuer", aud: "env-api" });
    } finally {
      process.env = saved;
    }
  });
  it("loads files and escaped PEM newlines and rejects incompatible keys", async () => {
    const directory = await mkdtemp(join(tmpdir(), "jwt-keys-"));
    try {
      const file = join(directory, "private.pem");
      await writeFile(file, keys.RS256.privateKey);
      const p = await provider({
        algorithms: ["RS256"],
        signing: { algorithm: "RS256", key: { file } },
        verificationKeys: [
          {
            algorithm: "RS256",
            key: { value: keys.RS256.publicKey.replace(/\n/g, "\\n") },
          },
        ],
      });
      await expect(
        p.verifyAccessToken(await p.signAccessToken("u")),
      ).resolves.toMatchObject({ sub: "u" });
      const bad = new JwtProvider();
      bad.configure({
        ...base,
        algorithms: ["RS256"],
        signing: { algorithm: "RS256", key: { value: keys.ES256.privateKey } },
      });
      await expect(bad.bootstrap()).rejects.toMatchObject({
        jwtCode: "JWT_CONFIGURATION",
      });
      const missing = new JwtProvider();
      missing.configure({
        ...base,
        signing: {
          algorithm: "HS256",
          key: { file: join(directory, "absent") },
        },
      });
      await expect(missing.bootstrap()).rejects.toBeInstanceOf(JwtError);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
  it("shares sanitized bootstrap failures and permits configuration correction and retry", async () => {
    const directory = await mkdtemp(join(tmpdir(), "jwt-bootstrap-"));
    const p = new JwtProvider();
    try {
      const file = join(directory, "missing-secret");
      expect(
        p.configure({
          ...base,
          signing: { algorithm: "HS256", key: { file } },
        }).valid,
      ).toBe(true);
      const results = await Promise.allSettled([
        p.bootstrap(),
        p.bootstrap(),
        p.bootstrap(),
      ]);
      const first = (results[0] as PromiseRejectedResult).reason;
      for (const result of results) {
        expect(result.status).toBe("rejected");
        const error = (result as PromiseRejectedResult).reason;
        expect(error).toBe(first);
        expect(error).toBeInstanceOf(JwtError);
        expect(error.jwtCode).toBe("JWT_CONFIGURATION");
        expect(error.message).toBe("JWT provider configuration is invalid");
        expect(String(error.stack)).not.toContain(file);
        expect(JSON.stringify(error)).not.toContain(file);
      }
      expect(p.configure(base).valid).toBe(true);
      await Promise.all([p.bootstrap(), p.bootstrap()]);
      await expect(
        p.verifyAccessToken(await p.signAccessToken("u")),
      ).resolves.toMatchObject({ sub: "u" });
    } finally {
      await p.shutdown();
      await rm(directory, { recursive: true, force: true });
    }
  });
  it("shuts down during initialization without becoming ready", async () => {
    const p = new JwtProvider();
    p.configure(base);
    const start = p.bootstrap();
    await p.shutdown();
    await start;
    await expect(p.signAccessToken("u")).rejects.toBeInstanceOf(JwtError);
  });
  it("rejects ambiguous static key selection", async () => {
    const p = new JwtProvider();
    expect(
      p.configure({ ...base, verificationKeys: [base.signing!, base.signing!] })
        .valid,
    ).toBe(false);
  });
});

describe("refresh rotation", () => {
  async function session(): Promise<{ p: JwtProvider; time: { now: number } }> {
    const time = { now: seconds };
    return {
      time,
      p: await provider({
        clock: () => time.now * 1000,
        refreshTtlSeconds: 100,
        sessionTtlSeconds: 150,
        refreshStore: new MemoryRefreshStore(),
      }),
    };
  }
  it("rotates, detects replay and revokes the successor family", async () => {
    const { p } = await session();
    const first = await p.issueTokens("u", { roles: ["user"] });
    const second = await p.rotateRefreshToken(first.refreshToken);
    expect(second.refreshToken).not.toEqual(first.refreshToken);
    await expect(
      p.verifyAccessToken(second.accessToken),
    ).resolves.toMatchObject({ roles: ["user"] });
    await expect(
      p.rotateRefreshToken(first.refreshToken),
    ).rejects.toMatchObject({ jwtCode: "JWT_REPLAY" });
    await expect(
      p.rotateRefreshToken(second.refreshToken),
    ).rejects.toMatchObject({ jwtCode: "JWT_INVALID" });
    await expect(p.verifyAccessToken(first.accessToken)).resolves.toMatchObject(
      { sub: "u" },
    );
  });
  it("atomically rejects concurrent reuse and revokes the winner's refresh family", async () => {
    const { p } = await session();
    const first = await p.issueTokens("u");
    const results = await Promise.allSettled([
      p.rotateRefreshToken(first.refreshToken),
      p.rotateRefreshToken(first.refreshToken),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    const winner = results.find(
      (r) => r.status === "fulfilled",
    ) as PromiseFulfilledResult<{ refreshToken: string }>;
    await expect(
      p.rotateRefreshToken(winner.value.refreshToken),
    ).rejects.toBeInstanceOf(JwtError);
  });
  it("revokes the active family when a consumed token is replayed after its expiry", async () => {
    const { p, time } = await session();
    const first = await p.issueTokens("u");
    time.now += 75;
    const second = await p.rotateRefreshToken(first.refreshToken);
    time.now = seconds + 101;
    await expect(
      p.verifyRefreshToken(first.refreshToken),
    ).rejects.toMatchObject({
      jwtCode: "JWT_EXPIRED",
    });
    await expect(
      p.rotateRefreshToken(first.refreshToken),
    ).rejects.toMatchObject({
      jwtCode: "JWT_REPLAY",
    });
    await expect(
      p.rotateRefreshToken(second.refreshToken),
    ).rejects.toMatchObject({
      jwtCode: "JWT_INVALID",
    });
    await expect(
      p.verifyAccessToken(second.accessToken),
    ).resolves.toMatchObject({ sub: "u" });
  });
  it("never rotates an expired active token or extends an expired absolute session", async () => {
    const { p, time } = await session();
    const first = await p.issueTokens("u");
    time.now += 101;
    await expect(
      p.rotateRefreshToken(first.refreshToken),
    ).rejects.toMatchObject({
      jwtCode: "JWT_EXPIRED",
    });
    time.now = seconds + 150;
    await expect(
      p.rotateRefreshToken(first.refreshToken),
    ).rejects.toMatchObject({
      jwtCode: "JWT_INVALID",
    });
  });
  it.each([
    ["wrong signature", {}, "another-test-secret-with-at-least-32-bytes!"],
    ["wrong issuer", { iss: "other" }],
    ["wrong audience", { aud: "other" }],
    ["mixed audience", { aud: ["test-api", 1] }],
    ["future nbf", { nbf: seconds + 120 }],
    ["wrong purpose", { token_use: "access" }],
    ["malformed expiry", { exp: seconds + 99.5 }],
    ["malformed roles", { roles: "admin" }],
  ])(
    "rejects expired %s tokens before the replay store",
    async (_name, overrides, signingSecret = secret) => {
      const time = { now: seconds };
      const store = new MemoryRefreshStore();
      const consume = jest.spyOn(store, "consume");
      const p = await provider({
        clock: () => time.now * 1000,
        refreshStore: store,
      });
      const first = await p.issueTokens("u");
      const claims = await p.verifyRefreshToken(first.refreshToken);
      await p.rotateRefreshToken(first.refreshToken);
      consume.mockClear();
      time.now += 101;
      const token = await raw(
        { ...claims, exp: seconds + 100, ...overrides },
        "HS256",
        new TextEncoder().encode(signingSecret),
      );
      await expect(p.rotateRefreshToken(token)).rejects.toMatchObject({
        jwtCode: "JWT_INVALID",
      });
      expect(consume).not.toHaveBeenCalled();
      await p.shutdown();
    },
  );
  it("does not extend absolute expiry and rejects expiry without tolerance", async () => {
    const { p, time } = await session();
    const first = await p.issueTokens("u");
    time.now += 75;
    const second = await p.rotateRefreshToken(first.refreshToken);
    expect((await p.verifyRefreshToken(second.refreshToken)).exp).toBe(
      seconds + 150,
    );
    time.now = seconds + 150;
    await expect(
      p.rotateRefreshToken(second.refreshToken),
    ).rejects.toBeInstanceOf(JwtError);
  });
  it("rejects expired, wrong-purpose, malformed, unknown and revoked refresh sessions", async () => {
    const { p, time } = await session();
    const first = await p.issueTokens("u");
    await p.revokeRefreshSession(first.refreshToken);
    await expect(
      p.rotateRefreshToken(first.refreshToken),
    ).rejects.toBeInstanceOf(JwtError);
    await expect(
      p.rotateRefreshToken(first.accessToken),
    ).rejects.toBeInstanceOf(JwtError);
    await expect(
      p.verifyAccessToken(first.refreshToken),
    ).rejects.toBeInstanceOf(JwtError);
    await expect(p.rotateRefreshToken("bad")).rejects.toBeInstanceOf(JwtError);
    await expect(
      p.rotateRefreshToken(
        await raw({
          token_use: "refresh",
          jti: "unknown",
          family: "unknown",
          session_exp: seconds + 100,
        }),
      ),
    ).rejects.toBeInstanceOf(JwtError);
    await expect(
      p.rotateRefreshToken(await raw({ token_use: "refresh" })),
    ).rejects.toBeInstanceOf(JwtError);
    const another = await p.issueTokens("u");
    time.now += 101;
    await expect(
      p.rotateRefreshToken(another.refreshToken),
    ).rejects.toBeInstanceOf(JwtError);
  });
  it("requires an explicitly supplied refresh store", async () => {
    const p = await provider();
    await expect(p.issueTokens("u")).rejects.toMatchObject({
      jwtCode: "JWT_CONFIGURATION",
    });
  });
});
