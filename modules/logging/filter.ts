import { LOG_LEVELS, type LogEvent, type LogFilter, type LogLevel } from "./types.js";

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  fatal: 50
};

export function shouldLogEvent(event: LogEvent, filter?: LogFilter): boolean {
  if (!filter) {
    return true;
  }

  if (filter.minLevel && LEVEL_WEIGHT[event.level] < LEVEL_WEIGHT[filter.minLevel]) {
    return false;
  }

  if (filter.includeCorrelationIds && filter.includeCorrelationIds.length > 0) {
    if (!event.correlationId || !filter.includeCorrelationIds.includes(event.correlationId)) {
      return false;
    }
  }

  if (filter.excludeCorrelationIds && event.correlationId) {
    if (filter.excludeCorrelationIds.includes(event.correlationId)) {
      return false;
    }
  }

  if (filter.allowedMetadataKeys && filter.allowedMetadataKeys.length > 0) {
    const filteredMetadata: Record<string, unknown> = {};
    for (const key of filter.allowedMetadataKeys) {
      if (key in event.metadata) {
        filteredMetadata[key] = event.metadata[key];
      }
    }
    event.metadata = filteredMetadata;
  }

  return LOG_LEVELS.includes(event.level);
}
