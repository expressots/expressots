import {
    provideSingleton,
    IBootstrap,
    IShutdown,
    Logger,
} from "@expressots/core";
import { Job, Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { randomUUID } from "node:crypto";
import {
    EmailJobPayload,
    EnqueuedJob,
    ProcessedJob,
} from "./queue.types";

const EMAIL_QUEUE = "email";

@provideSingleton(QueueProvider)
export class QueueProvider implements IBootstrap, IShutdown {
    private readonly logger = new Logger().withContext("QueueProvider");
    private redisConnection: IORedis | null = null;
    private emailQueue: Queue | null = null;
    private emailWorker: Worker | null = null;
    private readonly memoryJobs = new Map<string, EnqueuedJob>();
    private readonly processedJobs: ProcessedJob[] = [];
    private useRedis = false;

    get mode(): "redis" | "memory" {
        return this.useRedis ? "redis" : "memory";
    }

    getProcessedJobs(): ProcessedJob[] {
        return [...this.processedJobs];
    }

    getMemoryJob(id: string): EnqueuedJob | undefined {
        return this.memoryJobs.get(id);
    }

    async bootstrap(): Promise<void> {
        const redisUrl = process.env.REDIS_URL?.trim();

        if (!redisUrl) {
            this.logger.info("REDIS_URL not set; using in-memory queue fallback");
            this.useRedis = false;
            return;
        }

        try {
            this.redisConnection = new IORedis(redisUrl, {
                maxRetriesPerRequest: null,
            });

            await this.redisConnection.ping();

            this.emailQueue = new Queue(EMAIL_QUEUE, {
                connection: this.redisConnection,
            });

            this.emailWorker = new Worker(
                EMAIL_QUEUE,
                async (job: Job<EmailJobPayload>) => {
                    await this.processEmailJob(job.id ?? randomUUID(), job.data);
                },
                { connection: this.redisConnection.duplicate() },
            );

            this.useRedis = true;
            this.logger.info("BullMQ email queue connected via REDIS_URL");
        } catch (error) {
            this.logger.warn(
                `Redis unavailable (${error instanceof Error ? error.message : String(error)}); using in-memory queue fallback`,
            );
            await this.disposeRedis();
            this.useRedis = false;
        }
    }

    async enqueueEmail(payload: EmailJobPayload): Promise<EnqueuedJob> {
        if (this.useRedis && this.emailQueue) {
            const job = await this.emailQueue.add("send-email", payload);
            return {
                id: job.id ?? randomUUID(),
                name: EMAIL_QUEUE,
                payload,
                enqueuedAt: new Date(),
            };
        }

        const id = randomUUID();
        const enqueued: EnqueuedJob = {
            id,
            name: EMAIL_QUEUE,
            payload,
            enqueuedAt: new Date(),
        };

        this.memoryJobs.set(id, enqueued);
        await this.processEmailJob(id, payload);
        return enqueued;
    }

    async shutdown(signal?: NodeJS.Signals): Promise<void> {
        this.logger.info(`Shutting down queue provider (${signal ?? "manual"})`);
        await this.disposeRedis();
    }

    private async processEmailJob(id: string, payload: EmailJobPayload): Promise<void> {
        this.logger.info(`Processing email job ${id} for ${payload.to}: ${payload.subject}`);
        this.processedJobs.push({
            id,
            name: EMAIL_QUEUE,
            payload,
            processedAt: new Date(),
        });
    }

    private async disposeRedis(): Promise<void> {
        await this.emailWorker?.close();
        await this.emailQueue?.close();
        await this.redisConnection?.quit();

        this.emailWorker = null;
        this.emailQueue = null;
        this.redisConnection = null;
    }
}
