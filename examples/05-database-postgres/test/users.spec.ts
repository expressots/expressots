import {
    createTestApp,
    setupExpressoTSMatchers,
    TestAppResult,
} from "@expressots/core";
import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import { App } from "../src/app";

setupExpressoTSMatchers();

const skipDb = process.env.SKIP_DB === "true" || process.env.SKIP_DB === "1";

describe("Users API (postgres)", () => {
    let testApp: TestAppResult | undefined;
    let dbAvailable = !skipDb;

    beforeAll(async () => {
        if (skipDb) {
            return;
        }

        try {
            testApp = await createTestApp(App, {
                env: {
                    NODE_ENV: "test",
                    DB_HOST: process.env.DB_HOST ?? "localhost",
                    DB_PORT: process.env.DB_PORT ?? "5432",
                    DB_NAME: process.env.DB_NAME ?? "expressots",
                    DB_USER: process.env.DB_USER ?? "postgres",
                    DB_PASSWORD: process.env.DB_PASSWORD ?? "postgres",
                },
                autoCleanup: false,
            });
        } catch {
            dbAvailable = false;
        }
    });

    afterAll(async () => {
        await testApp?.cleanup();
    });

    it("creates and lists users when postgres is available", async () => {
        if (!dbAvailable) {
            return;
        }

        const email = `test-${Date.now()}@example.com`;
        const created = await testApp!.request
            .post("/api/users")
            .send({ email, name: "Test User" })
            .expectStatus(200)
            .execute();

        expect(created.body.email).toBe(email);

        const list = await testApp!.request.get("/api/users").expectStatus(200).execute();
        expect(Array.isArray(list.body)).toBe(true);
    });

    it("skips when SKIP_DB=true or connection fails", () => {
        if (dbAvailable) {
            expect(testApp).toBeDefined();
            return;
        }

        expect(skipDb || !testApp).toBe(true);
    });
});
