import {
    createTestApp,
    loadTest,
    setupExpressoTSMatchers,
    TestAppResult,
} from "@expressots/core";
import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import { App } from "../../src/app";

setupExpressoTSMatchers();

describe("Calculator API (load smoke)", () => {
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

    it("handles concurrent GET /api/calculator/add requests", async () => {
        const results = await loadTest(testApp.baseUrl, {
            endpoint: "/api/calculator/add?a=1&b=2",
            concurrent: 10,
            duration: "1s",
            warmupRequests: 0,
            assertions: {
                maxErrorRate: 0,
            },
        });

        expect(results.errorRate).toBe(0);
        expect(results.totalRequests).toBeGreaterThan(0);
    });
});
