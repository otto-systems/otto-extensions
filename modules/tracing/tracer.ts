import { randomUUID } from "node:crypto";

import {
  createChildTraceContext,
  createRootTraceContext,
  extractTraceContext,
  injectTraceContext
} from "./propagation.js";
import type {
  PropagationCarrier,
  SpanEndOptions,
  SpanStartOptions,
  TraceContext,
  TraceLayer,
  TraceMetadata,
  TraceSpan,
  TracerOptions
} from "./types.js";

export class SpanHandle {
  private readonly startedAt = new Date();
  private readonly spanId = randomUUID();
  private readonly traceId: string;
  private readonly parentSpanId?: string;
  private readonly correlationId: string;
  private readonly initialMetadata: TraceMetadata;
  private ended = false;

  public constructor(
    private readonly tracer: OttoTracer,
    private readonly layer: TraceLayer,
    private readonly name: string,
    metadata: TraceMetadata = {},
    parentContext?: TraceContext,
    explicitCorrelationId?: string
  ) {
    if (parentContext) {
      this.traceId = parentContext.traceId;
      this.parentSpanId = parentContext.spanId;
      this.correlationId = parentContext.correlationId;
    } else {
      this.traceId = randomUUID();
      this.correlationId = explicitCorrelationId ?? `corr-${randomUUID()}`;
    }

    this.initialMetadata = metadata;
  }

  public getContext(): TraceContext {
    return {
      traceId: this.traceId,
      spanId: this.spanId,
      parentSpanId: this.parentSpanId,
      correlationId: this.correlationId
    };
  }

  public inject(carrier: PropagationCarrier = {}): PropagationCarrier {
    return injectTraceContext(this.getContext(), carrier);
  }

  public async end(options: SpanEndOptions = {}): Promise<TraceSpan> {
    if (this.ended) {
      throw new Error("span already ended");
    }

    this.ended = true;

    const endedAt = new Date();
    const span: TraceSpan = {
      id: this.spanId,
      traceId: this.traceId,
      parentSpanId: this.parentSpanId,
      correlationId: this.correlationId,
      name: this.name,
      layer: this.layer,
      moduleId: this.tracer.getModuleId(),
      startedAt: this.startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      durationMs: endedAt.getTime() - this.startedAt.getTime(),
      status: options.status ?? "ok",
      metadata: {
        ...(this.tracer.getStaticMetadata() ?? {}),
        ...this.initialMetadata,
        ...(options.metadata ?? {})
      }
    };

    await this.tracer.recordSpan(span);
    return span;
  }
}

export class OttoTracer {
  public constructor(private readonly options: TracerOptions) {}

  public getModuleId(): string {
    return this.options.moduleId;
  }

  public getStaticMetadata(): TraceMetadata | undefined {
    return this.options.staticMetadata;
  }

  public startSpan(options: SpanStartOptions): SpanHandle {
    return new SpanHandle(
      this,
      options.layer,
      options.name,
      options.metadata,
      options.parentContext,
      options.correlationId
    );
  }

  public startFunctionSpan(
    functionName: string,
    metadata: TraceMetadata = {},
    parentContext?: TraceContext,
    correlationId?: string
  ): SpanHandle {
    return this.startSpan({
      name: functionName,
      layer: "function",
      metadata,
      parentContext,
      correlationId
    });
  }

  public startModuleSpan(
    operation: string,
    metadata: TraceMetadata = {},
    parentContext?: TraceContext,
    correlationId?: string
  ): SpanHandle {
    return this.startSpan({
      name: operation,
      layer: "module",
      metadata,
      parentContext,
      correlationId
    });
  }

  public startExtensionSpan(
    operation: string,
    metadata: TraceMetadata = {},
    parentContext?: TraceContext,
    correlationId?: string
  ): SpanHandle {
    return this.startSpan({
      name: operation,
      layer: "extension",
      metadata,
      parentContext,
      correlationId
    });
  }

  public startKernelSpan(
    operation: string,
    metadata: TraceMetadata = {},
    parentContext?: TraceContext,
    correlationId?: string
  ): SpanHandle {
    return this.startSpan({
      name: operation,
      layer: "kernel",
      metadata,
      parentContext,
      correlationId
    });
  }

  public extractContext(carrier: PropagationCarrier): TraceContext | undefined {
    return extractTraceContext(carrier);
  }

  public createRootContext(correlationId?: string): TraceContext {
    return createRootTraceContext(correlationId);
  }

  public createChildContext(parent: TraceContext): TraceContext {
    return createChildTraceContext(parent);
  }

  public injectContext(context: TraceContext, carrier: PropagationCarrier = {}): PropagationCarrier {
    return injectTraceContext(context, carrier);
  }

  public async recordSpan(span: TraceSpan): Promise<void> {
    await Promise.all(this.options.exporters.map((exporter) => exporter.exportSpan(span)));

    if (this.options.spanWriter) {
      await this.options.spanWriter.write(span);
    }

    if (this.options.decisionWriter) {
      await this.options.decisionWriter.write({
        id: randomUUID(),
        timestamp: span.endedAt,
        traceId: span.traceId,
        spanId: span.id,
        correlationId: span.correlationId,
        decision: "trace-span-recorded",
        reason: `span status=${span.status}`,
        metadata: {
          layer: span.layer,
          name: span.name,
          durationMs: span.durationMs,
          exporterCount: this.options.exporters.length
        }
      });
    }
  }
}
