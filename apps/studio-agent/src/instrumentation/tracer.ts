/**
 * OpenTelemetry tracer configuration for ExpressoTS Studio
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
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

/**
 * OpenTelemetry span processor that assembles finished spans into
 * complete traces for Studio.
 *
 * Spans are buffered per trace id; a trace is considered complete one
 * second after its last span ends, at which point the `onTraceComplete`
 * callback receives a `TraceInfo` with the root span identified and all
 * spans sorted by start time.
 */
export class StudioSpanProcessor implements SpanProcessor {
  private spans: Map<string, SpanInfo[]> = new Map();
  private onTraceComplete?: (trace: TraceInfo) => void;
  private traceTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private traceCompletionDelay = 1000; // Wait 1 second for all spans

  /**
   * @param onTraceComplete - Invoked once per assembled trace, after the
   *   one-second completion window elapses.
   */
  constructor(onTraceComplete?: (trace: TraceInfo) => void) {
    this.onTraceComplete = onTraceComplete;
  }

  /** No-op: spans are forwarded synchronously as traces complete. */
  forceFlush(): Promise<void> {
    return Promise.resolve();
  }

  onStart(_span: Span): void {
    // Span started - can emit event if needed
  }

  /** Buffer the finished span and (re)arm the trace-completion timeout. */
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
      parentSpanId: span.parentSpanContext?.spanId,
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

  /** Cancel pending trace timeouts and drop buffered spans. */
  shutdown(): Promise<void> {
    for (const timeout of this.traceTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.traceTimeouts.clear();
    this.spans.clear();
    return Promise.resolve();
  }
}

/**
 * Wrapper around the OpenTelemetry Node SDK used by the agent.
 *
 * Configures auto-instrumentation (with the noisy `fs` instrumentation
 * disabled) and routes finished spans through a `StudioSpanProcessor`
 * so completed traces reach the agent as `TraceInfo` objects.
 */
export class StudioTracer {
  private sdk: NodeSDK | null = null;
  private spanProcessor: StudioSpanProcessor | null = null;
  private serviceName: string;
  private serviceVersion: string;

  /**
   * @param serviceName - OTel `service.name` resource attribute.
   *   Default: "expressots-app".
   * @param serviceVersion - OTel `service.version` resource attribute.
   *   Default: "1.0.0".
   */
  constructor(
    serviceName: string = 'expressots-app',
    serviceVersion: string = '1.0.0'
  ) {
    this.serviceName = serviceName;
    this.serviceVersion = serviceVersion;
  }

  /**
   * Initialize and start the OpenTelemetry SDK.
   *
   * @param onTraceComplete - Invoked once per completed trace.
   * @returns Resolves when the SDK has started.
   */
  async start(onTraceComplete?: (trace: TraceInfo) => void): Promise<void> {
    this.spanProcessor = new StudioSpanProcessor(onTraceComplete);

    this.sdk = new NodeSDK({
      resource: resourceFromAttributes({
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

  /**
   * Stop the OpenTelemetry SDK.
   *
   * The shutdown drain is capped at 500ms so a stuck exporter never
   * delays the host application's own shutdown. Safe to call when the
   * SDK was never started.
   *
   * @returns Resolves once the drain completes or the cap elapses.
   */
  async stop(): Promise<void> {
    if (!this.sdk) return;
    const sdk = this.sdk;
    this.sdk = null;

    // Suppress the IPC channel error that OpenTelemetry's HTTP exporter
    // can emit on the process when running under `tsx --watch`. The OTLP
    // exporter lazy-loads its HTTP agent via dynamic `import()`; if SIGINT
    // arrives mid-flush, the loader's IPC channel may already be closed
    // and the rejection surfaces as an unhandled 'error' event on the
    // process (tsx wraps `process.emit` in suppress-warnings.cjs).
    // Swallowing this specific code keeps Ctrl+C clean without masking
    // real shutdown errors.
    const ipcErrorGuard = (err: NodeJS.ErrnoException): void => {
      if (err?.code === "ERR_IPC_CHANNEL_CLOSED") return;
      // Re-emit on the next tick so we don't disrupt the current emit
      // chain, and so the default Node behaviour (uncaught -> crash)
      // still applies to unexpected errors.
      setImmediate(() => {
        throw err;
      });
    };
    process.on("error", ipcErrorGuard);

    // Hard cap the OpenTelemetry shutdown. NodeSDK.shutdown() awaits every
    // span processor's `forceFlush` and `shutdown`, and the default span
    // processor flush timeout is 30s — that's where the user-visible
    // "press Ctrl+C, wait, then `Graceful shutdown completed`" lag comes
    // from. The SDK keeps no persistent state worth blocking shutdown on,
    // so we race the drain against a short timeout and move on.
    const drained = sdk.shutdown().catch(() => {
      // Best-effort: never hold the host shutdown on a stuck exporter.
    });
    const timeout = new Promise<void>((resolve) => setTimeout(resolve, 500));
    await Promise.race([drained, timeout]);

    // Keep the guard installed for one more tick: the IPC error from a
    // dangling lazy `import()` can land after our race resolves. Detach
    // it shortly after so the listener doesn't outlive the SDK forever.
    setTimeout(() => {
      process.removeListener("error", ipcErrorGuard);
    }, 1000).unref();
  }

  /**
   * Get an OpenTelemetry tracer instance.
   *
   * @param name - Tracer name. Default: "studio-agent".
   * @returns The tracer registered under that name.
   */
  getTracer(name: string = 'studio-agent') {
    return trace.getTracer(name);
  }

  /**
   * Run a function inside a new active span.
   *
   * The span status is set to OK on success or ERROR (with the error
   * message) when the function throws; the error is re-thrown.
   *
   * @param name - Span name.
   * @param fn - Function to execute inside the span.
   * @param attributes - Optional attributes set on the span.
   * @returns The promise returned by the active-span execution.
   */
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
