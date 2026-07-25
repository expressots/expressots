import {
    createTestApp,
    setupExpressoTSMatchers,
    TestAppResult,
} from "@expressots/core";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "@jest/globals";
import { App } from "../src/app";
import { LoggingInterceptor } from "../src/interceptors/logging.interceptor";
import { TimingInterceptor } from "../src/interceptors/timing.interceptor";

setupExpressoTSMatchers();

describe("Interceptors", () => {
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

    beforeEach(() => {
        LoggingInterceptor.lastRequest = null;
        TimingInterceptor.lastTimingMs = null;
    });

    it("GET /api/demo returns the controller payload", async () => {
        const response = await testApp.request
            .get("/api/demo")
            .expectStatus(200)
            .execute();

        expect(response.body).toMatchObject({
            message: "Interceptor demo",
            example: "14-interceptors",
        });
    });

    it("TimingInterceptor records execution duration", async () => {
        await testApp.request.get("/api/demo").expectStatus(200).execute();

        expect(typeof TimingInterceptor.lastTimingMs).toBe("number");
        expect(TimingInterceptor.lastTimingMs).toBeGreaterThanOrEqual(0);
    });

    it("LoggingInterceptor records the request path", async () => {
        await testApp.request.get("/api/demo").expectStatus(200).execute();

        expect(LoggingInterceptor.lastRequest).toEqual({
            method: "GET",
            path: "/demo",
        });
    });
});
