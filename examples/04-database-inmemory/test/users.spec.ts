import {
    createTestApp,
    setupExpressoTSMatchers,
    TestAppResult,
} from "@expressots/core";
import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import { App } from "../src/app";

setupExpressoTSMatchers();

describe("Users API (in-memory)", () => {
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

    it("creates and lists users", async () => {
        const created = await testApp.request
            .post("/api/users")
            .send({ email: "alice@example.com", name: "Alice" })
            .expectStatus(201)
            .execute();

        expect(created.body.email).toBe("alice@example.com");
        expect(created.body.id).toBeDefined();

        const list = await testApp.request.get("/api/users").expectStatus(200).execute();
        expect(Array.isArray(list.body)).toBe(true);
        expect(list.body.length).toBeGreaterThanOrEqual(1);
    });

    it("fetches a user by id", async () => {
        const created = await testApp.request
            .post("/api/users")
            .send({ email: "bob@example.com", name: "Bob" })
            .expectStatus(201)
            .execute();

        await testApp.request
            .get(`/api/users/${created.body.id}`)
            .expectStatus(200)
            .expectBodyPath("email", "bob@example.com")
            .execute();
    });
});
