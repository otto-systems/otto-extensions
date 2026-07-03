# Otto Logging Module

This module provides structured logging for Otto extensions with multi-sink fanout and MemPalace persistence.

## Features

- Structured log events
- Log levels: debug, info, warn, error, fatal
- Sinks: console, file, memory, server
- File rotation by size
- Event filtering by minimum level, correlation IDs, and metadata keys
- Correlation IDs for cross-service traceability
- ISO timestamps on all events and decisions
- Metadata enrichment per module and per event
- MemPalace persistence for schema, events, and decisions

## Quick Use

```ts
import { OttoLogger, ConsoleSink, MemorySink, FileSink, ServerSink } from "./index.js";

const logger = new OttoLogger({
  moduleId: "logging.module",
  sinks: [
    new ConsoleSink(),
    new FileSink({
      filePath: "logs/otto-logging.log",
      rotation: { maxBytes: 1024 * 1024, maxArchivedFiles: 5 }
    }),
    new MemorySink({ maxEntries: 1000 }),
    new ServerSink({ endpoint: "http://localhost:8080/logs" })
  ],
  filter: { minLevel: "info" },
  staticMetadata: { service: "otto-extension" }
});

const correlationId = "corr-7d420f";
await logger.info("starting pipeline", { step: "init" }, correlationId);
await logger.warn("slow response", { latencyMs: 812 }, correlationId);
await logger.decision("fallback-route", "primary endpoint timeout", { endpoint: "primary" }, correlationId);
```

## MemPalace Files

Runtime writes use `mempalace/logging/`:

- `log-schema.json`
- `log-events.jsonl`
- `log-decisions.jsonl`
