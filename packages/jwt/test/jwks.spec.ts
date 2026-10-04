import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { createServer } from "node:http";
import type { Server } from "node:http";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
import type { JWK } from "jose";
import { JwtProvider } from "../src/index.js";
let server: Server;
let url: string;
let requests = 0;
let published: Array<JWK> = [];
let first: Awaited<ReturnType<typeof generateKeyPair>>;
let second: Awaited<ReturnType<typeof generateKeyPair>>;
let firstJwk: JWK;
let secondJwk: JWK;
const now = 2000000000;
beforeAll(async () => {
  first = await generateKeyPair("RS256", { extractable: true });
  second = await generateKeyPair("RS256", { extractable: true });
  firstJwk = {
    ...(await exportJWK(first.publicKey)),
    kid: "first",
    alg: "RS256",
    use: "sig",
  };
  secondJwk = {
    ...(await exportJWK(second.publicKey)),
    kid: "second",
    alg: "RS256",
    use: "sig",
  };
  server = createServer((_request, response) => {
    requests++;
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ keys: published }));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Missing address");
  url = `http://127.0.0.1:${address.port}/jwks`;
});
afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
async function p(): Promise<JwtProvider> {
  const provider = new JwtProvider();
  expect(
    provider.configure({
      issuer: "issuer",
      audience: "api",
      algorithms: ["RS256"],
      clock: () => now * 1000,
      jwks: { url, allowLocalHttp: true, cooldownMs: 0 },
    }),
  ).toEqual({ valid: true });
  await provider.bootstrap();
  return provider;
}
async function token(
  key: CryptoKey,
  kid: string,
  extra: Record<string, unknown> = {},
): Promise<string> {
  return new SignJWT({
    sub: "u",
    iss: "issuer",
    aud: "api",
    exp: now + 100,
    token_use: "access",
  })
    .setProtectedHeader({ alg: "RS256", kid, ...extra })
    .sign(key);
}
describe("controlled remote JWKS", () => {
  it("caches keys and refreshes for rotation by kid", async () => {
    published = [firstJwk];
    const provider = await p();
    const start = requests;
    const a = await token(first.privateKey, "first");
    await provider.verifyAccessToken(a);
    await provider.verifyAccessToken(a);
    expect(requests - start).toBe(1);
    published = [firstJwk, secondJwk];
    await expect(
      provider.verifyAccessToken(await token(second.privateKey, "second")),
    ).resolves.toMatchObject({ sub: "u" });
    expect(requests - start).toBe(2);
  });
  it("fails closed for unknown kid, missing kid, bad signatures and ambiguous keys", async () => {
    published = [firstJwk];
    const provider = await p();
    for (const a of [
      await token(first.privateKey, "unknown"),
      await token(first.privateKey, ""),
      await token(second.privateKey, "first"),
    ])
      await expect(provider.verifyAccessToken(a)).rejects.toMatchObject({
        jwtCode: "JWT_INVALID",
      });
    published = [firstJwk, { ...secondJwk, kid: "first" }];
    const ambiguous = await p();
    await expect(
      ambiguous.verifyAccessToken(await token(first.privateKey, "first")),
    ).rejects.toMatchObject({ jwtCode: "JWT_INVALID" });
  });
  it("ignores untrusted jku/x5u and binds algorithms to key type", async () => {
    published = [firstJwk];
    const provider = await p();
    const start = requests;
    await expect(
      provider.verifyAccessToken(
        await token(first.privateKey, "first", {
          jku: "http://invalid.example/evil",
          x5u: "http://invalid.example/evil",
        }),
      ),
    ).resolves.toMatchObject({ sub: "u" });
    expect(requests - start).toBe(1);
    const ec = await generateKeyPair("ES256");
    const invalid = await new SignJWT({
      sub: "u",
      iss: "issuer",
      aud: "api",
      exp: now + 100,
      token_use: "access",
    })
      .setProtectedHeader({ alg: "ES256", kid: "first" })
      .sign(ec.privateKey);
    await expect(provider.verifyAccessToken(invalid)).rejects.toMatchObject({
      jwtCode: "JWT_INVALID",
    });
  });
  it("bounds a stalled JWKS request", async () => {
    const stalled = createServer(() => {});
    await new Promise<void>((resolve) =>
      stalled.listen(0, "127.0.0.1", resolve),
    );
    try {
      const address = stalled.address();
      if (!address || typeof address === "string") throw new Error();
      const provider = new JwtProvider();
      expect(
        provider.configure({
          issuer: "issuer",
          audience: "api",
          algorithms: ["RS256"],
          clock: () => now * 1000,
          jwks: {
            url: `http://127.0.0.1:${address.port}`,
            allowLocalHttp: true,
            timeoutMs: 25,
          },
        }).valid,
      ).toBe(true);
      await provider.bootstrap();
      await expect(
        provider.verifyAccessToken(await token(first.privateKey, "first")),
      ).rejects.toMatchObject({ jwtCode: "JWT_INVALID" });
    } finally {
      stalled.closeAllConnections();
      await new Promise<void>((resolve) => stalled.close(() => resolve()));
    }
  });
});
