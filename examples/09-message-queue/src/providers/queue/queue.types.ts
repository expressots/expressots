export interface EmailJobPayload {
    to: string;
    subject: string;
    body?: string;
}

export interface EnqueuedJob {
    id: string;
    name: string;
    payload: EmailJobPayload;
    enqueuedAt: Date;
}

export interface ProcessedJob {
    id: string;
    name: string;
    payload: EmailJobPayload;
    processedAt: Date;
}
