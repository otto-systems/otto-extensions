export const LOG_LEVELS = ["debug", "info", "warn", "error", "fatal"] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

export type LogMetadata = Record<string, unknown>;

export type LogEvent = {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  correlationId?: string;
  moduleId?: string;
  metadata: LogMetadata;
};

export type LogDecision = {
  id: string;
  timestamp: string;
  correlationId?: string;
  decision: string;
  reason: string;
  metadata: LogMetadata;
};

export type LogFilter = {
  minLevel?: LogLevel;
  includeCorrelationIds?: string[];
  excludeCorrelationIds?: string[];
  allowedMetadataKeys?: string[];
};

export type LogSink = {
  name: "console" | "file" | "memory" | "server" | "mempalace";
  write(event: LogEvent): Promise<void>;
  flush?(): Promise<void>;
};

export type LoggerOptions = {
  moduleId: string;
  filter?: LogFilter;
  sinks: LogSink[];
  staticMetadata?: LogMetadata;
  eventWriter?: {
    write(event: LogEvent): Promise<void>;
  };
  decisionWriter?: {
    write(decision: LogDecision): Promise<void>;
  };
};

export type FileRotationPolicy = {
  maxBytes: number;
  maxArchivedFiles: number;
};

export type FileSinkOptions = {
  filePath: string;
  rotation: FileRotationPolicy;
};

export type MemorySinkOptions = {
  maxEntries?: number;
};

export type ServerSinkOptions = {
  endpoint: string;
  apiKey?: string;
  timeoutMs?: number;
};
