import { randomUUID } from "node:crypto";

import type { PropagationCarrier, TraceContext } from "./types.js";

const TRACE_ID_HEADER = "x-otto-trace-id";
const SPAN_ID_HEADER = "x-otto-span-id";
const PARENT_SPAN_ID_HEADER = "x-otto-parent-span-id";
const CORRELATION_ID_HEADER = "x-otto-correlation-id";
const BAGGAGE_HEADER = "x-otto-baggage";

export function injectTraceContext(context: TraceContext, carrier: PropagationCarrier = {}): PropagationCarrier {
  carrier[TRACE_ID_HEADER] = context.traceId;
  carrier[SPAN_ID_HEADER] = context.spanId;
  carrier[CORRELATION_ID_HEADER] = context.correlationId;

  if (context.parentSpanId) {
    carrier[PARENT_SPAN_ID_HEADER] = context.parentSpanId;
  }

  if (context.baggage && Object.keys(context.baggage).length > 0) {
    carrier[BAGGAGE_HEADER] = encodeBaggage(context.baggage);
  }

  return carrier;
}

export function extractTraceContext(carrier: PropagationCarrier): TraceContext | undefined {
  const traceId = carrier[TRACE_ID_HEADER];
  const spanId = carrier[SPAN_ID_HEADER];
  const correlationId = carrier[CORRELATION_ID_HEADER];

  if (!traceId || !spanId || !correlationId) {
    return undefined;
  }

  return {
    traceId,
    spanId,
    parentSpanId: carrier[PARENT_SPAN_ID_HEADER],
    correlationId,
    baggage: decodeBaggage(carrier[BAGGAGE_HEADER])
  };
}

export function createRootTraceContext(correlationId?: string): TraceContext {
  return {
    traceId: randomUUID(),
    spanId: randomUUID(),
    correlationId: correlationId ?? `corr-${randomUUID()}`
  };
}

export function createChildTraceContext(parent: TraceContext): TraceContext {
  return {
    traceId: parent.traceId,
    spanId: randomUUID(),
    parentSpanId: parent.spanId,
    correlationId: parent.correlationId,
    baggage: parent.baggage ? { ...parent.baggage } : undefined
  };
}

function encodeBaggage(baggage: Record<string, string>): string {
  return Object.entries(baggage)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join(",");
}

function decodeBaggage(rawValue?: string): Record<string, string> | undefined {
  if (!rawValue) {
    return undefined;
  }

  const pairs = rawValue
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.split("="));

  const baggage: Record<string, string> = {};
  for (const [rawKey, rawVal] of pairs) {
    if (!rawKey || !rawVal) {
      continue;
    }
    baggage[decodeURIComponent(rawKey)] = decodeURIComponent(rawVal);
  }

  return Object.keys(baggage).length > 0 ? baggage : undefined;
}
