import {
    createTestApp,
    setupExpressoTSMatchers,
    TestAppResult,
} from "@expressots/core";
import { afterAll, beforeAll, describe, it, expect } from "@jest/globals";
import { App } from "../src/app";

setupExpressoTSMatchers();

describe("AppController", () => {
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

    describe("GET /api/", () => {
        it("returns the welcome payload", async () => {
            await testApp.request
                .get("/api/")
                .expectStatus(200)
                .expectBody({ message: "Hello from ExpressoTS v4!" })
                .execute();
        });
    });

    describe("GET /api/health", () => {
        it("returns ok with uptime", async () => {
            const response = await testApp.request
                .get("/api/health")
                .expectStatus(200)
                .execute();

            expect(response.body).toMatchObject({
                status: "ok",
            });
            expect(typeof response.body.uptime).toBe("number");
        });
    });
});
