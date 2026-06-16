import {
    createTestApp,
    EventRecorder,
    setupExpressoTSMatchers,
    TestAppResult,
} from "@expressots/core";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "@jest/globals";
import { App } from "../src/app";
import { UserCreatedEvent } from "../src/events/user-created.event";
import { WelcomeEmailHandler } from "../src/events/welcome-email.handler";

setupExpressoTSMatchers();

describe("Events", () => {
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
        WelcomeEmailHandler.lastHandled = null;
        const recorder = testApp.container.get(EventRecorder);
        recorder.clear();
        recorder.startRecording();
    });

    it("POST /api/users creates a user and emits UserCreatedEvent", async () => {
        const response = await testApp.request
            .post("/api/users")
            .send({ email: "ada@example.com" })
            .expectStatus(201)
            .execute();

        expect(response.body).toMatchObject({
            email: "ada@example.com",
        });
        expect(typeof response.body.id).toBe("string");

        expect(WelcomeEmailHandler.lastHandled).toMatchObject({
            userId: response.body.id,
            email: "ada@example.com",
        });

        const recorder = testApp.container.get(EventRecorder);
        const recorded = recorder.getEventsByType(UserCreatedEvent);
        expect(recorded).toHaveLength(1);
        expect(recorded[0].data).toMatchObject({
            userId: response.body.id,
            email: "ada@example.com",
        });
    });
});
