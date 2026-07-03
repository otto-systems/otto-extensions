import { appendFile, mkdir, writeFile } from "node:fs/promises";

import type { TraceDecision, TraceSpan } from "./types.js";

export const TRACE_SPAN_SCHEMA: Record<string, unknown> = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "Otto Trace Span",
  type: "object",
  required: [
    "id",
    "traceId",
    "correlationId",
    "name",
    "layer",
    "moduleId",
    "startedAt",
    "endedAt",
    "durationMs",
    "status",
    "metadata"
  ],
  properties: {
    id: { type: "string" },
    traceId: { type: "string" },
    parentSpanId: { type: ["string", "null"] },
    correlationId: { type: "string" },
    name: { type: "string" },
    layer: { type: "string", enum: ["function", "module", "extension", "kernel"] },
    moduleId: { type: "string" },
    startedAt: { type: "string", format: "date-time" },
    endedAt: { type: "string", format: "date-time" },
    durationMs: { type: "number", minimum: 0 },
    status: { type: "string", enum: ["ok", "error", "cancelled"] },
    metadata: { type: "object", additionalProperties: true }
  },
  additionalProperties: false
};

export const TRACE_DECISION_SCHEMA: Record<string, unknown> = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "Otto Trace Decision",
  type: "object",
  required: [
    "id",
    "timestamp",
    "traceId",
    "correlationId",
    "decision",
    "reason",
    "metadata"
  ],
  properties: {
    id: { type: "string" },
    timestamp: { type: "string", format: "date-time" },
    traceId: { type: "string" },
    spanId: { type: ["string", "null"] },
    correlationId: { type: "string" },
    decision: { type: "string" },
    reason: { type: "string" },
    metadata: { type: "object", additionalProperties: true }
  },
  additionalProperties: false
};

export const TRACE_PROPAGATION_SCHEMA: Record<string, unknown> = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "Otto Trace Propagation Headers",
  type: "object",
  required: ["x-otto-trace-id", "x-otto-span-id", "x-otto-correlation-id"],
  properties: {
    "x-otto-trace-id": { type: "string" },
    "x-otto-span-id": { type: "string" },
    "x-otto-parent-span-id": { type: ["string", "null"] },
    "x-otto-correlation-id": { type: "string" },
    "x-otto-baggage": { type: ["string", "null"] }
  },
  additionalProperties: true
};

export type TraceMemPalaceWriter = {
  writeSchema(schema: Record<string, unknown>): Promise<void>;
  writeSpan(span: TraceSpan): Promise<void>;
  writeDecision(decision: TraceDecision): Promise<void>;
};

export function createTraceMemPalaceWriter(basePath: string): TraceMemPalaceWriter {
  const schemaPath = `${basePath}/trace-schema.json`;
  const spansPath = `${basePath}/trace-spans.jsonl`;
  const decisionsPath = `${basePath}/trace-decisions.jsonl`;

  return {
    async writeSchema(schema: Record<string, unknown>): Promise<void> {
      await mkdir(basePath, { recursive: true });
      await writeFile(schemaPath, `${JSON.stringify(schema, null, 2)}\n`, "utf8");
    },
    async writeSpan(span: TraceSpan): Promise<void> {
      await mkdir(basePath, { recursive: true });
      await appendFile(spansPath, `${JSON.stringify(span)}\n`, "utf8");
    },
    async writeDecision(decision: TraceDecision): Promise<void> {
      await mkdir(basePath, { recursive: true });
      await appendFile(decisionsPath, `${JSON.stringify(decision)}\n`, "utf8");
    }
  };
}
