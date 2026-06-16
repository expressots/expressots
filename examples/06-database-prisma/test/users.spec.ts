import {
    createTestApp,
    setupExpressoTSMatchers,
    TestAppResult,
} from "@expressots/core";
import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import { App } from "../src/app";

setupExpressoTSMatchers();

const databaseUrl = process.env.DATABASE_URL;

describe("Users API (prisma)", () => {
    let testApp: TestAppResult | undefined;

    beforeAll(async () => {
        if (!databaseUrl) {
            return;
        }

        testApp = await createTestApp(App, {
            env: {
                NODE_ENV: "test",
                DATABASE_URL: databaseUrl,
            },
            autoCleanup: false,
        });
    });

    afterAll(async () => {
        await testApp?.cleanup();
    });

    it("creates and lists users when DATABASE_URL is set", async () => {
        if (!databaseUrl || !testApp) {
            return;
        }

        const email = `prisma-${Date.now()}@example.com`;
        const created = await testApp.request
            .post("/api/users")
            .send({ email, name: "Prisma User" })
            .expectStatus(200)
            .execute();

        expect(created.body.email).toBe(email);

        const list = await testApp.request.get("/api/users").expectStatus(200).execute();
        expect(Array.isArray(list.body)).toBe(true);
    });

    it("skips when DATABASE_URL is not set", () => {
        if (databaseUrl) {
            expect(testApp).toBeDefined();
            return;
        }

        expect(databaseUrl).toBeUndefined();
    });
});
