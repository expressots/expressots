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

    it("GET /api/ returns welcome payload", async () => {
        await testApp.request
            .get("/api/")
            .expectStatus(200)
            .expectBodyPath("example", "01-starter-api")
            .execute();
    });

    it("GET /api/health returns ok", async () => {
        const response = await testApp.request
            .get("/api/health")
            .expectStatus(200)
            .execute();

        expect(response.body).toMatchObject({ status: "ok" });
    });
});
