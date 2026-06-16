import {
    createTestApp,
    setupExpressoTSMatchers,
    TestAppResult,
} from "@expressots/core";
import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import { App } from "../src/app";

setupExpressoTSMatchers();

describe("Docker Compose app", () => {
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

    it("GET /api/health returns degraded when postgres is not configured", async () => {
        const response = await testApp.request.get("/api/health").expectStatus(200).execute();

        expect(response.body).toMatchObject({
            status: "degraded",
            database: {
                mode: "unconfigured",
                healthy: false,
            },
        });
    });
});
