import {
    createTestApp,
    setupExpressoTSMatchers,
    TestAppResult,
} from "@expressots/core";
import { afterAll, beforeAll, describe, it } from "@jest/globals";
import { App } from "../../src/app";

setupExpressoTSMatchers();

describe("Calculator API (integration)", () => {
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

    it("GET /api/calculator/add returns the sum", async () => {
        await testApp.request
            .get("/api/calculator/add")
            .query({ a: "2", b: "3" })
            .expectStatus(200)
            .expectBody({
                operation: "add",
                a: 2,
                b: 3,
                result: 5,
            })
            .execute();
    });

    it("GET /api/calculator/multiply returns the product", async () => {
        await testApp.request
            .get("/api/calculator/multiply")
            .query({ a: "4", b: "5" })
            .expectStatus(200)
            .expectBody({
                operation: "multiply",
                a: 4,
                b: 5,
                result: 20,
            })
            .execute();
    });
});
