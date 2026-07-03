# Otto Tracing Module

This module provides distributed tracing for Otto extensions and persists tracing data in MemPalace.

## Features

- Function-level tracing
- Module-level tracing
- Extension-level tracing
- Kernel-level tracing
- Span creation and lifecycle management
- Span propagation over carrier headers
- Span exporters: console, file, memory, server
- Trace correlation IDs on every span
- Rich trace metadata for context and decisions
- MemPalace persistence for schema, spans, and decisions

## Quick Use

```ts
import { OttoTracer, ConsoleSpanExporter } from "./index.js";

const tracer = new OttoTracer({
  moduleId: "tracing.module",
  exporters: [new ConsoleSpanExporter()]
});

const moduleSpan = tracer.startModuleSpan("module-init", { env: "dev" });
const fnSpan = tracer.startFunctionSpan("resolvePolicy", { policy: "safe-update" }, moduleSpan.getContext());

await fnSpan.end({ status: "ok", metadata: { result: "accepted" } });
await moduleSpan.end({ status: "ok" });
```

## MemPalace Files

Runtime writes use mempalace/tracing:

- trace-schema.json
- trace-spans.jsonl
- trace-decisions.jsonl
