export const METRIC_KINDS = ["counter", "gauge", "histogram", "timer"] as const;

export const METRIC_SCOPES = [
  "module",
  "kernel",
  "extension",
  "update",
  "command-service"
] as const;

export type MetricKind = (typeof METRIC_KINDS)[number];

export type MetricScope = (typeof METRIC_SCOPES)[number];

export type MetricLabels = Record<string, string | number | boolean>;

export type MetricMetadata = Record<string, unknown>;

export type MetricDefinition = {
  name: string;
  description: string;
  kind: MetricKind;
  scope: MetricScope;
  unit?: string;
};

export type MetricEventAction =
  | "metric-registered"
  | "counter-increment"
  | "gauge-set"
  | "histogram-observe"
  | "timer-record";

export type MetricEvent = {
  id: string;
  timestamp: string;
  moduleId: string;
  metricName: string;
  kind: MetricKind;
  scope: MetricScope;
  action: MetricEventAction;
  value: number;
  labels: MetricLabels;
  metadata: MetricMetadata;
};

export type MetricDecision = {
  id: string;
  timestamp: string;
  moduleId: string;
  decision: string;
  reason: string;
  metadata: MetricMetadata;
};

export type HistogramState = {
  count: number;
  sum: number;
  min: number;
  max: number;
  buckets: number[];
  bucketCounts: number[];
};

export type TimerState = {
  count: number;
  sumMs: number;
  minMs: number;
  maxMs: number;
};

export type MetricSnapshot = {
  counters: Record<string, number>;
  gauges: Record<string, number>;
  histograms: Record<string, HistogramState>;
  timers: Record<string, TimerState>;
};

export type MetricsRegistryOptions = {
  moduleId: string;
  staticMetadata?: MetricMetadata;
  eventWriter?: {
    write(event: MetricEvent): Promise<void>;
  };
  decisionWriter?: {
    write(decision: MetricDecision): Promise<void>;
  };
};
