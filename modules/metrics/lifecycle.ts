import {
  createMetricsMemPalaceWriter,
  METRIC_DECISION_SCHEMA,
  METRIC_EVENT_SCHEMA,
  METRIC_SCHEMA_SCHEMA
} from "./mempalace.js";
import { OttoMetricsRegistry } from "./metrics.js";
import type { MetricDefinition } from "./types.js";

export type ModuleLifecycleContext = {
  moduleId: string;
  startedAt: string;
};

let metrics: OttoMetricsRegistry | undefined;

const DEFAULT_METRICS: MetricDefinition[] = [
  {
    name: "module.lifecycle.loads",
    description: "Number of times the metrics module has been loaded.",
    kind: "counter",
    scope: "module",
    unit: "count"
  },
  {
    name: "module.lifecycle.starts",
    description: "Number of times the metrics module has been started.",
    kind: "counter",
    scope: "module",
    unit: "count"
  },
  {
    name: "module.lifecycle.stops",
    description: "Number of times the metrics module has been stopped.",
    kind: "counter",
    scope: "module",
    unit: "count"
  },
  {
    name: "kernel.active_extensions",
    description: "Observed count of active extensions in kernel runtime.",
    kind: "gauge",
    scope: "kernel",
    unit: "count"
  },
  {
    name: "extension.bootstrap.duration_ms",
    description: "Distribution of extension bootstrap latency.",
    kind: "histogram",
    scope: "extension",
    unit: "ms"
  },
  {
    name: "update.check.duration_ms",
    description: "Observed time spent on update checks.",
    kind: "timer",
    scope: "update",
    unit: "ms"
  },
  {
    name: "command_service.commands.routed",
    description: "Count of commands routed by command-service.",
    kind: "counter",
    scope: "command-service",
    unit: "count"
  }
];

export async function onLoad(context: ModuleLifecycleContext): Promise<void> {
  const memPalaceWriter = createMetricsMemPalaceWriter("mempalace/metrics");

  metrics = new OttoMetricsRegistry({
    moduleId: context.moduleId,
    staticMetadata: {
      startedAt: context.startedAt,
      source: "otto-extensions.metrics"
    },
    eventWriter: {
      write: (event) => memPalaceWriter.writeEvent(event)
    },
    decisionWriter: {
      write: (decision) => memPalaceWriter.writeDecision(decision)
    }
  });

  await memPalaceWriter.writeSchema({
    metric: METRIC_SCHEMA_SCHEMA,
    event: METRIC_EVENT_SCHEMA,
    decision: METRIC_DECISION_SCHEMA,
    definitions: DEFAULT_METRICS
  });

  for (const metric of DEFAULT_METRICS) {
    await metrics.registerMetric(metric);
  }

  await metrics.incrementCounter("module.lifecycle.loads", 1, {}, { phase: "load" });
  await metrics.setGauge("kernel.active_extensions", 1, {}, { phase: "load" });
  await metrics.observeHistogram("extension.bootstrap.duration_ms", 8, {}, { phase: "load" });
  await metrics.recordTimer("update.check.duration_ms", 5, {}, { phase: "load" });
  await metrics.incrementCounter("command_service.commands.routed", 1, {}, { phase: "load" });
}

export async function onStart(context: ModuleLifecycleContext): Promise<void> {
  if (!metrics) {
    await onLoad(context);
  }

  await metrics?.incrementCounter("module.lifecycle.starts", 1, {}, { phase: "start" });

  const extensionBootstrapTimer = metrics?.startTimer(
    "update.check.duration_ms",
    { stage: "extension-start" },
    { phase: "start" }
  );
  await extensionBootstrapTimer?.stop({ result: "ok" });

  await metrics?.observeHistogram("extension.bootstrap.duration_ms", 12, {}, { phase: "start" });
}

export async function onStop(_context: ModuleLifecycleContext): Promise<void> {
  if (!metrics) {
    return;
  }

  await metrics.incrementCounter("module.lifecycle.stops", 1, {}, { phase: "stop" });
  await metrics.setGauge("kernel.active_extensions", 0, {}, { phase: "stop" });
}

export function getMetricsRegistry(): OttoMetricsRegistry {
  if (!metrics) {
    throw new Error("metrics module not initialized");
  }
  return metrics;
}
