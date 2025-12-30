import {
    createTestApp,
    setupExpressoTSMatchers,
    TestAppResult,
} from "@expressots/core";
import { afterAll, beforeAll, describe, it } from "@jest/globals";
import { App } from "../src/app";

// Setup ExpressoTS custom matchers
setupExpressoTSMatchers();

describe("AppController", () => {
    let testApp: TestAppResult;

    beforeAll(async () => {
        testApp = await createTestApp(App, {
            env: {
                NODE_ENV: "test",
            },
            autoCleanup: false,
        });
    });

    afterAll(async () => {
        await testApp.cleanup();
    });

    describe("GET /", () => {
        it("should return welcome message", async () => {
            await testApp.request
                .get("/")
                .expectStatus(200)
                .expectBody("Hello from ExpressoTS!")
                .execute();
        });
    });
});
