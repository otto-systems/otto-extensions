import { randomUUID } from "node:crypto";

import type {
  HistogramState,
  MetricDecision,
  MetricDefinition,
  MetricEvent,
  MetricLabels,
  MetricMetadata,
  MetricSnapshot,
  MetricsRegistryOptions,
  TimerState
} from "./types.js";

type TimerHandle = {
  stop(metadata?: MetricMetadata): Promise<number>;
};

export class OttoMetricsRegistry {
  private readonly definitions = new Map<string, MetricDefinition>();
  private readonly counters = new Map<string, number>();
  private readonly gauges = new Map<string, number>();
  private readonly histograms = new Map<string, HistogramState>();
  private readonly timers = new Map<string, TimerState>();

  public constructor(private readonly options: MetricsRegistryOptions) {}

  public async registerMetric(definition: MetricDefinition): Promise<void> {
    this.definitions.set(definition.name, definition);

    if (definition.kind === "counter" && !this.counters.has(definition.name)) {
      this.counters.set(definition.name, 0);
    }
    if (definition.kind === "gauge" && !this.gauges.has(definition.name)) {
      this.gauges.set(definition.name, 0);
    }
    if (definition.kind === "histogram" && !this.histograms.has(definition.name)) {
      this.histograms.set(definition.name, {
        count: 0,
        sum: 0,
        min: Number.POSITIVE_INFINITY,
        max: Number.NEGATIVE_INFINITY,
        buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
        bucketCounts: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      });
    }
    if (definition.kind === "timer" && !this.timers.has(definition.name)) {
      this.timers.set(definition.name, {
        count: 0,
        sumMs: 0,
        minMs: Number.POSITIVE_INFINITY,
        maxMs: Number.NEGATIVE_INFINITY
      });
    }

    await this.writeEvent({
      metricName: definition.name,
      kind: definition.kind,
      scope: definition.scope,
      action: "metric-registered",
      value: 0,
      labels: {},
      metadata: {
        description: definition.description,
        unit: definition.unit
      }
    });

    await this.writeDecision("metric-registered", "metric definition accepted", {
      metricName: definition.name,
      kind: definition.kind,
      scope: definition.scope
    });
  }

  public async incrementCounter(
    metricName: string,
    amount = 1,
    labels: MetricLabels = {},
    metadata: MetricMetadata = {}
  ): Promise<number> {
    const definition = this.expectDefinition(metricName, "counter");
    const next = (this.counters.get(metricName) ?? 0) + amount;
    this.counters.set(metricName, next);

    await this.writeEvent({
      metricName,
      kind: definition.kind,
      scope: definition.scope,
      action: "counter-increment",
      value: amount,
      labels,
      metadata: {
        ...metadata,
        total: next
      }
    });

    return next;
  }

  public async setGauge(
    metricName: string,
    value: number,
    labels: MetricLabels = {},
    metadata: MetricMetadata = {}
  ): Promise<number> {
    const definition = this.expectDefinition(metricName, "gauge");
    this.gauges.set(metricName, value);

    await this.writeEvent({
      metricName,
      kind: definition.kind,
      scope: definition.scope,
      action: "gauge-set",
      value,
      labels,
      metadata
    });

    return value;
  }

  public async observeHistogram(
    metricName: string,
    value: number,
    labels: MetricLabels = {},
    metadata: MetricMetadata = {}
  ): Promise<void> {
    const definition = this.expectDefinition(metricName, "histogram");
    const state = this.histograms.get(metricName);
    if (!state) {
      throw new Error(`histogram metric not initialized: ${metricName}`);
    }

    state.count += 1;
    state.sum += value;
    state.min = Math.min(state.min, value);
    state.max = Math.max(state.max, value);

    let bucketIndex = state.buckets.findIndex((boundary) => value <= boundary);
    if (bucketIndex < 0) {
      bucketIndex = state.bucketCounts.length - 1;
    }
    state.bucketCounts[bucketIndex] += 1;

    await this.writeEvent({
      metricName,
      kind: definition.kind,
      scope: definition.scope,
      action: "histogram-observe",
      value,
      labels,
      metadata
    });
  }

  public startTimer(
    metricName: string,
    labels: MetricLabels = {},
    metadata: MetricMetadata = {}
  ): TimerHandle {
    this.expectDefinition(metricName, "timer");
    const started = Date.now();

    return {
      stop: async (stopMetadata: MetricMetadata = {}): Promise<number> => {
        const elapsedMs = Date.now() - started;
        await this.recordTimer(metricName, elapsedMs, labels, {
          ...metadata,
          ...stopMetadata
        });
        return elapsedMs;
      }
    };
  }

  public async recordTimer(
    metricName: string,
    durationMs: number,
    labels: MetricLabels = {},
    metadata: MetricMetadata = {}
  ): Promise<void> {
    const definition = this.expectDefinition(metricName, "timer");
    const state = this.timers.get(metricName);
    if (!state) {
      throw new Error(`timer metric not initialized: ${metricName}`);
    }

    state.count += 1;
    state.sumMs += durationMs;
    state.minMs = Math.min(state.minMs, durationMs);
    state.maxMs = Math.max(state.maxMs, durationMs);

    await this.writeEvent({
      metricName,
      kind: definition.kind,
      scope: definition.scope,
      action: "timer-record",
      value: durationMs,
      labels,
      metadata
    });
  }

  public getSnapshot(): MetricSnapshot {
    return {
      counters: Object.fromEntries(this.counters.entries()),
      gauges: Object.fromEntries(this.gauges.entries()),
      histograms: Object.fromEntries(this.histograms.entries()),
      timers: Object.fromEntries(this.timers.entries())
    };
  }

  private expectDefinition(metricName: string, kind: MetricDefinition["kind"]): MetricDefinition {
    const definition = this.definitions.get(metricName);
    if (!definition) {
      throw new Error(`metric not registered: ${metricName}`);
    }
    if (definition.kind !== kind) {
      throw new Error(`metric ${metricName} is ${definition.kind}, expected ${kind}`);
    }
    return definition;
  }

  private async writeEvent(event: Omit<MetricEvent, "id" | "timestamp" | "moduleId">): Promise<void> {
    if (!this.options.eventWriter) {
      return;
    }

    await this.options.eventWriter.write({
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      moduleId: this.options.moduleId,
      ...event,
      metadata: {
        ...(this.options.staticMetadata ?? {}),
        ...event.metadata
      }
    });
  }

  private async writeDecision(decision: string, reason: string, metadata: MetricMetadata = {}): Promise<void> {
    if (!this.options.decisionWriter) {
      return;
    }

    const payload: MetricDecision = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      moduleId: this.options.moduleId,
      decision,
      reason,
      metadata: {
        ...(this.options.staticMetadata ?? {}),
        ...metadata
      }
    };

    await this.options.decisionWriter.write(payload);
  }
}
