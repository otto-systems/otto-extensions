import {
  ConsoleSpanExporter,
  FileSpanExporter,
  MemorySpanExporter,
  ServerSpanExporter
} from "./exporters.js";
import {
  createTraceMemPalaceWriter,
  TRACE_DECISION_SCHEMA,
  TRACE_PROPAGATION_SCHEMA,
  TRACE_SPAN_SCHEMA
} from "./mempalace.js";
import { OttoTracer } from "./tracer.js";

export type ModuleLifecycleContext = {
  moduleId: string;
  startedAt: string;
  serverExporterEndpoint?: string;
};

let tracer: OttoTracer | undefined;
let memoryExporter: MemorySpanExporter | undefined;

export async function onLoad(context: ModuleLifecycleContext): Promise<void> {
  const memPalaceWriter = createTraceMemPalaceWriter("mempalace/tracing");
  memoryExporter = new MemorySpanExporter({ maxEntries: 5000 });

  const exporters = [
    new ConsoleSpanExporter(),
    new FileSpanExporter({ filePath: "logs/otto-tracing-spans.jsonl" }),
    memoryExporter,
    new ServerSpanExporter({
      endpoint: context.serverExporterEndpoint ?? "http://localhost:8080/traces"
    })
  ];

  tracer = new OttoTracer({
    moduleId: context.moduleId,
    exporters,
    staticMetadata: {
      startedAt: context.startedAt,
      source: "otto-extensions.tracing"
    },
    spanWriter: {
      write: (span) => memPalaceWriter.writeSpan(span)
    },
    decisionWriter: {
      write: (decision) => memPalaceWriter.writeDecision(decision)
    }
  });

  await memPalaceWriter.writeSchema({
    span: TRACE_SPAN_SCHEMA,
    decision: TRACE_DECISION_SCHEMA,
    propagation: TRACE_PROPAGATION_SCHEMA
  });

  const loadSpan = tracer.startModuleSpan("tracing-module-load", {
    phase: "load",
    moduleId: context.moduleId
  });
  await loadSpan.end({ status: "ok" });
}

export async function onStart(context: ModuleLifecycleContext): Promise<void> {
  if (!tracer) {
    await onLoad(context);
  }

  const moduleStartSpan = tracer?.startModuleSpan("tracing-module-start", {
    phase: "start",
    moduleId: context.moduleId
  });

  const extensionBootstrapSpan = tracer?.startExtensionSpan("extension-bootstrap", {
    moduleId: context.moduleId,
    startedAt: context.startedAt
  }, moduleStartSpan?.getContext());

  await extensionBootstrapSpan?.end({
    status: "ok",
    metadata: { detail: "extension tracing bootstrap complete" }
  });

  await moduleStartSpan?.end({ status: "ok" });
}

export async function onStop(context: ModuleLifecycleContext): Promise<void> {
  if (!tracer) {
    return;
  }

  const stopSpan = tracer.startModuleSpan("tracing-module-stop", {
    phase: "stop",
    moduleId: context.moduleId
  });

  const retainedSpans = memoryExporter?.readAll().length ?? 0;
  const kernelSpan = tracer.startKernelSpan("kernel-tracing-shutdown", {
    retainedSpans
  }, stopSpan.getContext());

  await kernelSpan.end({ status: "ok" });
  await stopSpan.end({ status: "ok", metadata: { retainedSpans } });
}

export function getTracer(): OttoTracer {
  if (!tracer) {
    throw new Error("tracing module not initialized");
  }
  return tracer;
}
