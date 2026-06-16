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
                JWT_SECRET: "dev-secret-change-me-min-32-chars-long",
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
        const token = signTestToken({ id: "u1", roles: ["user"] });

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
    });
});
