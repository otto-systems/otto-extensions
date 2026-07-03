import { OttoLogger } from "./logger.js";
import { createMemPalaceWriter, ConsoleSink, FileSink, MemorySink, ServerSink } from "./sinks.js";
import { LOG_DECISION_SCHEMA, LOG_EVENT_SCHEMA } from "./mempalace.js";

export type ModuleLifecycleContext = {
  moduleId: string;
  startedAt: string;
  serverSinkEndpoint?: string;
};

let logger: OttoLogger | undefined;
let memorySink: MemorySink | undefined;

export async function onLoad(context: ModuleLifecycleContext): Promise<void> {
  const memPalaceWriter = createMemPalaceWriter("mempalace/logging");
  memorySink = new MemorySink({ maxEntries: 2000 });

  const sinks = [
    new ConsoleSink(),
    new FileSink({
      filePath: "logs/otto-logging.log",
      rotation: { maxBytes: 1024 * 1024, maxArchivedFiles: 5 }
    }),
    memorySink,
    new ServerSink({ endpoint: context.serverSinkEndpoint ?? "http://localhost:8080/logs" })
  ];

  logger = new OttoLogger({
    moduleId: context.moduleId,
    sinks,
    filter: {
      minLevel: "debug"
    },
    staticMetadata: {
      startedAt: context.startedAt,
      source: "otto-extensions.logging"
    },
    eventWriter: {
      write: (event) => memPalaceWriter.writeEvent(event)
    },
    decisionWriter: {
      write: (decision) => memPalaceWriter.writeDecision(decision)
    }
  });

  await memPalaceWriter.writeSchema({
    event: LOG_EVENT_SCHEMA,
    decision: LOG_DECISION_SCHEMA
  });

  await logger.info("logging module loaded", { phase: "load" });
  await logger.decision("module-load", "logger initialized", { sinkCount: sinks.length });
}

export async function onStart(context: ModuleLifecycleContext): Promise<void> {
  if (!logger) {
    await onLoad(context);
  }

  await logger?.info("logging module started", { phase: "start" });
  await logger?.decision("module-start", "module accepted start signal", { moduleId: context.moduleId });
}

export async function onStop(context: ModuleLifecycleContext): Promise<void> {
  if (!logger) {
    return;
  }

  await logger.info("logging module stopping", { phase: "stop" });
  await logger.decision("module-stop", "module accepted stop signal", { moduleId: context.moduleId });

  const retainedCount = memorySink?.readAll().length ?? 0;
  await logger.info("memory sink retained events", { retainedCount });
}

export function getLogger(): OttoLogger {
  if (!logger) {
    throw new Error("logging module not initialized");
  }
  return logger;
}
