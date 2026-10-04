import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import {
  AppExpress,
  setupAuthorizationForExpress,
  controller,
  Get,
  principal,
  request,
  getHttpContext,
} from "@expressots/adapter-express";
import {
  AppContainer,
  CreateModule,
  RequireRoles,
  RequirePermissions,
  RequireAuthentication,
  UseGuards,
  createTestApp,
} from "@expressots/core";
import type { Request } from "express";
import type { ISecurityContext } from "@expressots/core";
import type { TestAppResult } from "@expressots/core";
import {
  JwtProvider,
  JwtAuthGuard,
  JwtPrincipal,
  createJwtSessionMiddleware,
} from "../src/index.js";

@controller("/jwt")
class ProtectedController {
  @Get("/roles")
  @RequireRoles("admin")
  @RequireAuthentication()
  @UseGuards(JwtAuthGuard)
  roles(@principal() user: JwtPrincipal): unknown {
    return user.details;
  }
  @Get("/session")
  @RequireAuthentication()
  @RequirePermissions("profile:read")
  async session(
    @principal() user: JwtPrincipal,
    @request() req: Request,
  ): Promise<unknown> {
    const http = getHttpContext(req);
    if (!http) throw new Error("Missing context");
    const first = http.container.get<ISecurityContext>("ISecurityContext");
    const second = http.container.get<ISecurityContext>("ISecurityContext");
    return {
      id: user.details.id,
      permissions: await first.getPermissions(),
      sharedWithinRequest: first === second,
    };
  }
  @Get("/permissions")
  @RequirePermissions("profile:read")
  @UseGuards(JwtAuthGuard)
  permissions(@principal() user: JwtPrincipal): unknown {
    return user.details;
  }
}
let instance: JwtProvider;
class App extends AppExpress {
  globalConfiguration(): void {
    void this.setGlobalRoutePrefix("/api");
  }
  private readonly container: AppContainer = this.configContainer([
    CreateModule([ProtectedController, JwtProvider]),
  ]);
  async configureServices(): Promise<void> {
    this.Middleware.applyPreset("api");
    this.Middleware.setErrorHandler();
    instance = this.container.Container.get(JwtProvider);
    const result = instance.configure({
      issuer: "integration",
      audience: "api",
      signing: {
        algorithm: "HS256",
        key: { value: "test-only-secret-with-at-least-32-bytes!" },
      },
      clock: () => 2000000000000,
    });
    if (!result.valid) throw new Error(result.errors?.join("; "));
    this.Middleware.add({
      path: "/jwt/session",
      middlewares: [createJwtSessionMiddleware({}, this.container.Container)],
    });
    setupAuthorizationForExpress(
      this.container.Container,
      { enablePreloading: false },
      this.Middleware,
    );
  }
}
let app: TestAppResult;
beforeAll(async () => {
  app = await createTestApp(App, {
    autoCleanup: false,
    env: { NODE_ENV: "test" },
  });
});
afterAll(async () => {
  await app.cleanup();
});
describe("Express JWT guard with framework authorization", () => {
  it("returns 401 for no token and invalid tokens", async () => {
    const missing = await app.request
      .get("/api/jwt/roles")
      .expectStatus(401)
      .execute();
    expect(missing.body).toEqual({
      code: 401,
      error: "Authentication required",
    });
    await app.request
      .get("/api/jwt/roles")
      .set("Authorization", "Bearer garbage")
      .expectStatus(401)
      .execute();
    const expired = new JwtProvider();
    expired.configure({
      issuer: "integration",
      audience: "api",
      signing: {
        algorithm: "HS256",
        key: { value: "test-only-secret-with-at-least-32-bytes!" },
      },
      clock: () => 1000000000000,
    });
    await expired.bootstrap();
    await app.request
      .get("/api/jwt/roles")
      .set("Authorization", `Bearer ${await expired.signAccessToken("u")}`)
      .expectStatus(401)
      .execute();
    await expired.shutdown();
  });
  it("authenticates before role checks and exposes only verified identity", async () => {
    const denied = await instance.signAccessToken("user", { roles: ["user"] });
    await app.request
      .get("/api/jwt/roles")
      .set("Authorization", `Bearer ${denied}`)
      .expectStatus(403)
      .execute();
    const accepted = await instance.signAccessToken("admin", {
      roles: ["admin"],
      permissions: ["profile:read"],
      email: "verified@example.invalid",
    });
    const response = await app.request
      .get("/api/jwt/roles")
      .set("Authorization", `Bearer ${accepted}`)
      .expectStatus(200)
      .execute();
    expect(response.body).toMatchObject({
      sub: "admin",
      id: "admin",
      roles: ["admin"],
      permissions: ["profile:read"],
      email: "verified@example.invalid",
    });
  });
  it("checks permissions and prevents identity leakage across requests", async () => {
    const accepted = await instance.signAccessToken("a", {
      permissions: ["profile:read"],
    });
    const denied = await instance.signAccessToken("b", { permissions: [] });
    await app.request
      .get("/api/jwt/permissions")
      .set("Authorization", `Bearer ${accepted}`)
      .expectStatus(200)
      .expectBodyPath("id", "a")
      .execute();
    await app.request
      .get("/api/jwt/permissions")
      .set("Authorization", `Bearer ${denied}`)
      .expectStatus(403)
      .execute();
    await app.request.get("/api/jwt/permissions").expectStatus(401).execute();
  });
  it("session middleware uses verified request-local identity and permission context", async () => {
    const token = await instance.signAccessToken("session-user", {
      permissions: ["profile:read"],
    });
    const response = await app.request
      .get("/api/jwt/session")
      .set("Authorization", `Bearer ${token}`)
      .expectStatus(200)
      .execute();
    expect(response.body).toEqual({
      id: "session-user",
      permissions: ["profile:read"],
      sharedWithinRequest: true,
    });
    await app.request.get("/api/jwt/session").expectStatus(401).execute();
    await app.request
      .get("/api/jwt/session")
      .set("Authorization", "Bearer invalid")
      .expectStatus(401)
      .execute();
    const denied = await instance.signAccessToken("other", { permissions: [] });
    await app.request
      .get("/api/jwt/session")
      .set("Authorization", `Bearer ${denied}`)
      .expectStatus(403)
      .execute();
  });
  it("concurrent requests do not share principals", async () => {
    const a = await instance.signAccessToken("a", { roles: ["admin"] });
    const b = await instance.signAccessToken("b", { roles: ["admin"] });
    const responses = await Promise.all([
      app.request
        .get("/api/jwt/roles")
        .set("Authorization", `Bearer ${a}`)
        .expectStatus(200)
        .execute(),
      app.request
        .get("/api/jwt/roles")
        .set("Authorization", `Bearer ${b}`)
        .expectStatus(200)
        .execute(),
    ]);
    expect(responses.map((r) => r.body.id)).toEqual(["a", "b"]);
  });
  it("rejects missing provider and unsupported cookie or policy overrides", () => {
    expect(() => createJwtSessionMiddleware()).toThrow("Register JwtProvider");
    const container = app.container;
    expect(() =>
      createJwtSessionMiddleware({ storage: "cookie" }, container),
    ).toThrow("Bearer headers");
    expect(() =>
      createJwtSessionMiddleware({ issuer: "override" }, container),
    ).toThrow("Configure JWT");
  });
});
