import { appendFile, mkdir, writeFile } from "node:fs/promises";

import type { MetricDecision, MetricEvent } from "./types.js";

export const METRIC_SCHEMA_SCHEMA: Record<string, unknown> = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "Otto Metric Definition",
  type: "object",
  required: ["name", "description", "kind", "scope"],
  properties: {
    name: { type: "string" },
    description: { type: "string" },
    kind: { type: "string", enum: ["counter", "gauge", "histogram", "timer"] },
    scope: {
      type: "string",
      enum: ["module", "kernel", "extension", "update", "command-service"]
    },
    unit: { type: ["string", "null"] }
  },
  additionalProperties: false
};

export const METRIC_EVENT_SCHEMA: Record<string, unknown> = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "Otto Metric Event",
  type: "object",
  required: [
    "id",
    "timestamp",
    "moduleId",
    "metricName",
    "kind",
    "scope",
    "action",
    "value",
    "labels",
    "metadata"
  ],
  properties: {
    id: { type: "string" },
    timestamp: { type: "string", format: "date-time" },
    moduleId: { type: "string" },
    metricName: { type: "string" },
    kind: { type: "string", enum: ["counter", "gauge", "histogram", "timer"] },
    scope: {
      type: "string",
      enum: ["module", "kernel", "extension", "update", "command-service"]
    },
    action: {
      type: "string",
      enum: [
        "metric-registered",
        "counter-increment",
        "gauge-set",
        "histogram-observe",
        "timer-record"
      ]
    },
    value: { type: "number" },
    labels: { type: "object", additionalProperties: { type: ["string", "number", "boolean"] } },
    metadata: { type: "object", additionalProperties: true }
  },
  additionalProperties: false
};

export const METRIC_DECISION_SCHEMA: Record<string, unknown> = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "Otto Metric Decision",
  type: "object",
  required: ["id", "timestamp", "moduleId", "decision", "reason", "metadata"],
  properties: {
    id: { type: "string" },
    timestamp: { type: "string", format: "date-time" },
    moduleId: { type: "string" },
    decision: { type: "string" },
    reason: { type: "string" },
    metadata: { type: "object", additionalProperties: true }
  },
  additionalProperties: false
};

export type MetricsMemPalaceWriter = {
  writeSchema(schema: Record<string, unknown>): Promise<void>;
  writeEvent(event: MetricEvent): Promise<void>;
  writeDecision(decision: MetricDecision): Promise<void>;
};

export function createMetricsMemPalaceWriter(basePath: string): MetricsMemPalaceWriter {
  const schemaPath = `${basePath}/metric-schema.json`;
  const eventsPath = `${basePath}/metric-events.jsonl`;
  const decisionsPath = `${basePath}/metric-decisions.jsonl`;

  return {
    async writeSchema(schema: Record<string, unknown>): Promise<void> {
      await mkdir(basePath, { recursive: true });
      await writeFile(schemaPath, `${JSON.stringify(schema, null, 2)}\n`, "utf8");
    },
    async writeEvent(event: MetricEvent): Promise<void> {
      await mkdir(basePath, { recursive: true });
      await appendFile(eventsPath, `${JSON.stringify(event)}\n`, "utf8");
    },
    async writeDecision(decision: MetricDecision): Promise<void> {
      await mkdir(basePath, { recursive: true });
      await appendFile(decisionsPath, `${JSON.stringify(decision)}\n`, "utf8");
    }
  };
}
