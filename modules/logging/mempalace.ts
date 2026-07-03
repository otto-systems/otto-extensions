export const LOG_EVENT_SCHEMA: Record<string, unknown> = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "Otto Logging Event",
  type: "object",
  required: ["id", "timestamp", "level", "message", "metadata"],
  properties: {
    id: { type: "string" },
    timestamp: { type: "string", format: "date-time" },
    level: {
      type: "string",
      enum: ["debug", "info", "warn", "error", "fatal"]
    },
    message: { type: "string" },
    correlationId: { type: ["string", "null"] },
    moduleId: { type: ["string", "null"] },
    metadata: { type: "object", additionalProperties: true }
  },
  additionalProperties: false
};

export const LOG_DECISION_SCHEMA: Record<string, unknown> = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "Otto Logging Decision",
  type: "object",
  required: ["id", "timestamp", "decision", "reason", "metadata"],
  properties: {
    id: { type: "string" },
    timestamp: { type: "string", format: "date-time" },
    correlationId: { type: ["string", "null"] },
    decision: { type: "string" },
    reason: { type: "string" },
    metadata: { type: "object", additionalProperties: true }
  },
  additionalProperties: false
};
