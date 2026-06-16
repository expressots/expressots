import {
    createTestApp,
    setupExpressoTSMatchers,
    TestAppResult,
} from "@expressots/core";
import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import { App } from "../src/app";
import { QueueProvider } from "../src/providers/queue/queue.provider";

setupExpressoTSMatchers();

describe("Message queue", () => {
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

    it("POST /api/jobs/email enqueues an email job (in-memory fallback)", async () => {
        const response = await testApp.request
            .post("/api/jobs/email")
            .send({
                to: "test@expressots.dev",
                subject: "Welcome",
                body: "Hello from the queue example",
            })
            .expectStatus(202)
            .execute();

        expect(response.body).toMatchObject({
            queue: "email",
            mode: "memory",
            status: "queued",
        });
        expect(typeof response.body.jobId).toBe("string");

        const queue = testApp.container.get(QueueProvider);
        expect(queue.mode).toBe("memory");
        expect(queue.getProcessedJobs()).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: response.body.jobId,
                    payload: expect.objectContaining({
                        to: "test@expressots.dev",
                        subject: "Welcome",
                    }),
                }),
            ]),
        );
    });
});
