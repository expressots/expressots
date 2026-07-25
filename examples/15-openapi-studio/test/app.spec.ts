import {
    createTestApp,
    setupExpressoTSMatchers,
    TestAppResult,
} from "@expressots/core";
import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
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
            .expectBodyPath("example", "15-openapi-studio")
            .execute();
    });

    it("GET /api/health returns ok", async () => {
        const response = await testApp.request
            .get("/api/health")
            .expectStatus(200)
            .execute();

        expect(response.body).toMatchObject({ status: "ok" });
    });

    it("POST /api/echo echoes the request body", async () => {
        const response = await testApp.request
            .post("/api/echo")
            .send({ message: "hello studio" })
            .expectStatus(201)
            .execute();

        expect(response.body).toMatchObject({
            echoed: { message: "hello studio" },
        });
        expect(typeof response.body.receivedAt).toBe("string");
    });
});
