import {
    createTestApp,
    setupExpressoTSMatchers,
    TestAppResult,
} from "@expressots/core";
import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import { App } from "../src/app";

setupExpressoTSMatchers();

describe("Redis cache", () => {
    let testApp: TestAppResult;

    beforeAll(async () => {
        testApp = await createTestApp(App, {
            env: { NODE_ENV: "test" },
            autoCleanup: false,
        });
    });

    afterAll(async () => {
        await testApp.cleanup();
    });

    it("GET /api/health reports cache health", async () => {
        const response = await testApp.request.get("/api/health").expectStatus(200).execute();

        expect(response.body).toMatchObject({
            status: "ok",
            cache: {
                mode: "memory",
                healthy: true,
            },
        });
    });

    it("POST then GET /api/cache/:key stores and retrieves values", async () => {
        await testApp.request
            .post("/api/cache/greeting")
            .send({ value: "hello" })
            .expectStatus(201)
            .execute();

        const response = await testApp.request
            .get("/api/cache/greeting")
            .expectStatus(200)
            .execute();

        expect(response.body).toMatchObject({
            key: "greeting",
            value: "hello",
            mode: "memory",
        });
    });

    it("GET /api/cache/:key returns 404 on cache miss", async () => {
        await testApp.request.get("/api/cache/missing-key").expectStatus(404).execute();
    });
});
