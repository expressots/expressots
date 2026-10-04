import {
    createTestApp,
    setupExpressoTSMatchers,
    TestAppResult,
} from "@expressots/core";
import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import { App } from "../src/app";
import { signTestToken } from "./helpers";

setupExpressoTSMatchers();

describe("Authentication", () => {
    let testApp: TestAppResult;

    beforeAll(async () => {
        testApp = await createTestApp(App, {
            env: {
                NODE_ENV: "test",
                JWT_SECRET: "test-only-secret-with-at-least-32-bytes!",
                JWT_ISSUER: "example-test",
                JWT_AUDIENCE: "example-api",
            },
            autoCleanup: false,
        });
    });

    afterAll(async () => {
        await testApp.cleanup();
    });

    it("rejects unauthenticated requests to /users/me", async () => {
        await testApp.request.get("/api/users/me").expectStatus(401).execute();
    });

    it("accepts a valid bearer token", async () => {
        const token = await signTestToken({ id: "u1", roles: ["user"] });

        await testApp.request
            .get("/api/users/me")
            .set("Authorization", `Bearer ${token}`)
            .expectStatus(200)
            .expectBodyPath("id", "u1")
            .execute();
    });

    it("logs in with seeded demo user", async () => {
        const response = await testApp.request
            .post("/api/auth/login")
            .send({ email: "demo@expressots.dev", password: "password123" })
            .expectStatus(201)
            .execute();

        expect(response.body.accessToken).toBeDefined();
        const rotated = await testApp.request
            .post("/api/auth/refresh")
            .send({ refreshToken: response.body.refreshToken })
            .expectStatus(201)
            .execute();
        expect(rotated.body.refreshToken).not.toBe(response.body.refreshToken);
        await testApp.request
            .post("/api/auth/refresh")
            .send({ refreshToken: response.body.refreshToken })
            .expectStatus(401)
            .execute();
        await testApp.request
            .post("/api/auth/refresh")
            .send({ refreshToken: rotated.body.refreshToken })
            .expectStatus(401)
            .execute();
    });
    it("rejects an invalid token", async () => {
        await testApp.request
            .get("/api/users/me")
            .set("Authorization", "Bearer invalid")
            .expectStatus(401)
            .execute();
    });
    it("requires the admin role after JWT authentication", async () => {
        const user = await signTestToken({ id: "u1", roles: ["user"] });
        await testApp.request
            .get("/api/users/admin")
            .set("Authorization", `Bearer ${user}`)
            .expectStatus(403)
            .execute();
        const admin = await signTestToken({ id: "u2", roles: ["admin"] });
        await testApp.request
            .get("/api/users/admin")
            .set("Authorization", `Bearer ${admin}`)
            .expectStatus(200)
            .expectBodyPath("id", "u2")
            .execute();
    });
    it("checks permissions and isolates requests", async () => {
        const token = await signTestToken({ id: "u1", permissions: [] });
        await testApp.request
            .get("/api/users/me")
            .set("Authorization", `Bearer ${token}`)
            .expectStatus(403)
            .execute();
        await testApp.request.get("/api/users/me").expectStatus(401).execute();
    });
    it("revokes refresh sessions on logout", async () => {
        const login = await testApp.request
            .post("/api/auth/login")
            .send({ email: "demo@expressots.dev", password: "password123" })
            .expectStatus(201)
            .execute();
        await testApp.request
            .post("/api/auth/logout")
            .send({ refreshToken: login.body.refreshToken })
            .expectStatus(201)
            .execute();
        await testApp.request
            .post("/api/auth/refresh")
            .send({ refreshToken: login.body.refreshToken })
            .expectStatus(401)
            .execute();
    });
});
