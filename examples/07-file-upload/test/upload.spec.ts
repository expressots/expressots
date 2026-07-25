import {
    createTestApp,
    setupExpressoTSMatchers,
    TestAppResult,
} from "@expressots/core";
import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import { App } from "../src/app";

setupExpressoTSMatchers();

describe("Upload API", () => {
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

    it("GET /api/health returns ok", async () => {
        const response = await testApp.request.get("/api/health").expectStatus(200).execute();
        expect(response.body).toMatchObject({ status: "ok" });
    });

    it("POST /api/upload/avatar responds when no file is sent", async () => {
        const response = await testApp.request.post("/api/upload/avatar").expectStatus(201).execute();
        expect(response.body).toMatchObject({ message: "File uploaded successfully" });
    });
});
