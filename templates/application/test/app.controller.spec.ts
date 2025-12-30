import "reflect-metadata";

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
        // Zero-config test app creation
        testApp = await createTestApp(App, {
            env: {
                NODE_ENV: "test",
            },
        });
    });

    afterAll(async () => {
        // Clean up test app
        await testApp.cleanup();
    });

    describe("GET /", () => {
        it("should return welcome message", async () => {
            const response = await testApp.request
                .get("/")
                .expectStatus(200)
                .expectBody("Hello from ExpressoTS!")
                .execute();
        });
    });
});
