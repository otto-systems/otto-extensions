export const TRACE_LAYERS = ["function", "module", "extension", "kernel"] as const;

export type TraceLayer = (typeof TRACE_LAYERS)[number];

export type SpanStatus = "ok" | "error" | "cancelled";

export type TraceMetadata = Record<string, unknown>;

export type TraceContext = {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  correlationId: string;
  baggage?: Record<string, string>;
};

export type TraceSpan = {
  id: string;
  traceId: string;
  parentSpanId?: string;
  correlationId: string;
  name: string;
  layer: TraceLayer;
  moduleId: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  status: SpanStatus;
  metadata: TraceMetadata;
};

export type TraceDecision = {
  id: string;
  timestamp: string;
  traceId: string;
  spanId?: string;
  correlationId: string;
  decision: string;
  reason: string;
  metadata: TraceMetadata;
};

export type SpanExporter = {
  name: "console" | "file" | "memory" | "server" | "mempalace";
  exportSpan(span: TraceSpan): Promise<void>;
  flush?(): Promise<void>;
};

export type FileSpanExporterOptions = {
  filePath: string;
};

export type MemorySpanExporterOptions = {
  maxEntries?: number;
};

export type ServerSpanExporterOptions = {
  endpoint: string;
  apiKey?: string;
  timeoutMs?: number;
};

export type TracerOptions = {
  moduleId: string;
  exporters: SpanExporter[];
  staticMetadata?: TraceMetadata;
  spanWriter?: {
    write(span: TraceSpan): Promise<void>;
  };
  decisionWriter?: {
    write(decision: TraceDecision): Promise<void>;
  };
};

export type SpanStartOptions = {
  name: string;
  layer: TraceLayer;
  metadata?: TraceMetadata;
  parentContext?: TraceContext;
  correlationId?: string;
};

export type SpanEndOptions = {
  status?: SpanStatus;
  metadata?: TraceMetadata;
};

export type PropagationCarrier = Record<string, string>;
