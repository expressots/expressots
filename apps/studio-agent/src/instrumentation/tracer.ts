/**
 * OpenTelemetry tracer configuration for ExpressoTS Studio
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import {
  SpanProcessor,
  ReadableSpan,
  Span,
} from '@opentelemetry/sdk-trace-node';
import { trace, context, SpanKind, SpanStatusCode } from '@opentelemetry/api';
import type { SpanInfo, TraceInfo } from '../types/index.js';

/** Custom span processor that emits spans to Studio */
export class StudioSpanProcessor implements SpanProcessor {
  private spans: Map<string, SpanInfo[]> = new Map();
  private onTraceComplete?: (trace: TraceInfo) => void;
  private traceTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private traceCompletionDelay = 1000; // Wait 1 second for all spans

  constructor(onTraceComplete?: (trace: TraceInfo) => void) {
    this.onTraceComplete = onTraceComplete;
  }

  forceFlush(): Promise<void> {
    return Promise.resolve();
  }

  onStart(_span: Span): void {
    // Span started - can emit event if needed
  }

  onEnd(span: ReadableSpan): void {
    const traceId = span.spanContext().traceId;
    const spanInfo = this.convertSpan(span);

    if (!this.spans.has(traceId)) {
      this.spans.set(traceId, []);
    }
    this.spans.get(traceId)!.push(spanInfo);

    // Reset timeout for this trace
    const existingTimeout = this.traceTimeouts.get(traceId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout to complete the trace
    const timeout = setTimeout(() => {
      this.completeTrace(traceId);
    }, this.traceCompletionDelay);

    this.traceTimeouts.set(traceId, timeout);
  }

  private completeTrace(traceId: string): void {
    const spans = this.spans.get(traceId);
    if (!spans || spans.length === 0) return;

    // Find root span (one without parent or with parent not in this trace)
    const spanIds = new Set(spans.map((s) => s.spanId));
    const rootSpan =
      spans.find(
        (s) => !s.parentSpanId || !spanIds.has(s.parentSpanId)
      ) || spans[0];

    const traceInfo: TraceInfo = {
      traceId,
      rootSpan,
      spans: spans.sort((a, b) => a.startTime - b.startTime),
      startTime: Math.min(...spans.map((s) => s.startTime)),
      endTime: Math.max(...spans.map((s) => s.endTime)),
      duration: 0,
    };
    traceInfo.duration = traceInfo.endTime - traceInfo.startTime;

    this.onTraceComplete?.(traceInfo);

    // Cleanup
    this.spans.delete(traceId);
    this.traceTimeouts.delete(traceId);
  }

  private convertSpan(span: ReadableSpan): SpanInfo {
    const attributes: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(span.attributes)) {
      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        attributes[key] = value;
      } else if (value !== undefined) {
        attributes[key] = String(value);
      }
    }

    return {
      traceId: span.spanContext().traceId,
      spanId: span.spanContext().spanId,
      parentSpanId: span.parentSpanId,
      name: span.name,
      kind: this.getSpanKindName(span.kind),
      startTime: span.startTime[0] * 1000 + span.startTime[1] / 1e6,
      endTime: span.endTime[0] * 1000 + span.endTime[1] / 1e6,
      duration:
        (span.endTime[0] - span.startTime[0]) * 1000 +
        (span.endTime[1] - span.startTime[1]) / 1e6,
      status: this.getStatusName(span.status.code),
      attributes,
      events: span.events.map((e) => ({
        name: e.name,
        timestamp: e.time[0] * 1000 + e.time[1] / 1e6,
        attributes: e.attributes as Record<string, string | number | boolean>,
      })),
    };
  }

  private getSpanKindName(
    kind: SpanKind
  ): 'SERVER' | 'CLIENT' | 'INTERNAL' | 'PRODUCER' | 'CONSUMER' {
    switch (kind) {
      case SpanKind.SERVER:
        return 'SERVER';
      case SpanKind.CLIENT:
        return 'CLIENT';
      case SpanKind.PRODUCER:
        return 'PRODUCER';
      case SpanKind.CONSUMER:
        return 'CONSUMER';
      default:
        return 'INTERNAL';
    }
  }

  private getStatusName(code: SpanStatusCode): 'OK' | 'ERROR' | 'UNSET' {
    switch (code) {
      case SpanStatusCode.OK:
        return 'OK';
      case SpanStatusCode.ERROR:
        return 'ERROR';
      default:
        return 'UNSET';
    }
  }

  shutdown(): Promise<void> {
    for (const timeout of this.traceTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.traceTimeouts.clear();
    this.spans.clear();
    return Promise.resolve();
  }
}

/** OpenTelemetry SDK wrapper */
export class StudioTracer {
  private sdk: NodeSDK | null = null;
  private spanProcessor: StudioSpanProcessor | null = null;
  private serviceName: string;
  private serviceVersion: string;

  constructor(
    serviceName: string = 'expressots-app',
    serviceVersion: string = '1.0.0'
  ) {
    this.serviceName = serviceName;
    this.serviceVersion = serviceVersion;
  }

  /** Initialize the OpenTelemetry SDK */
  async start(onTraceComplete?: (trace: TraceInfo) => void): Promise<void> {
    this.spanProcessor = new StudioSpanProcessor(onTraceComplete);

    this.sdk = new NodeSDK({
      resource: new Resource({
        [ATTR_SERVICE_NAME]: this.serviceName,
        [ATTR_SERVICE_VERSION]: this.serviceVersion,
      }),
      spanProcessors: [this.spanProcessor],
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': { enabled: false },
        }),
      ],
    });

    await this.sdk.start();
  }

  /** Stop the OpenTelemetry SDK */
  async stop(): Promise<void> {
    if (this.sdk) {
      await this.sdk.shutdown();
      this.sdk = null;
    }
  }

  /** Get the current tracer */
  getTracer(name: string = 'studio-agent') {
    return trace.getTracer(name);
  }

  /** Create a custom span */
  createSpan(
    name: string,
    fn: () => void | Promise<void>,
    attributes?: Record<string, string | number | boolean>
  ) {
    const tracer = this.getTracer();
    return tracer.startActiveSpan(name, async (span) => {
      if (attributes) {
        span.setAttributes(attributes);
      }
      try {
        await fn();
        span.setStatus({ code: SpanStatusCode.OK });
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }
}

export { trace, context, SpanKind, SpanStatusCode };
