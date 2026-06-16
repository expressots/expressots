import { controller, Post, body, Http } from "@expressots/adapter-express";
import { inject } from "@expressots/core";
import { QueueProvider } from "@providers/queue/queue.provider";
import { EmailJobPayload } from "@providers/queue/queue.types";

@controller("/jobs")
export class JobController {
    constructor(@inject(QueueProvider) private readonly queue: QueueProvider) {}

    @Http(202)
    @Post("/email")
    async enqueueEmail(@body() payload: EmailJobPayload) {
        const job = await this.queue.enqueueEmail(payload);
        return {
            jobId: job.id,
            queue: job.name,
            mode: this.queue.mode,
            status: "queued",
        };
    }
}
