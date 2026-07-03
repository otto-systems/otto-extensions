import { randomUUID } from "node:crypto";

import { shouldLogEvent } from "./filter.js";
import type {
  LogDecision,
  LogEvent,
  LogLevel,
  LoggerOptions,
  LogMetadata
} from "./types.js";

export class OttoLogger {
  public constructor(private readonly options: LoggerOptions) {}

  public async debug(message: string, metadata: LogMetadata = {}, correlationId?: string): Promise<void> {
    await this.log("debug", message, metadata, correlationId);
  }

  public async info(message: string, metadata: LogMetadata = {}, correlationId?: string): Promise<void> {
    await this.log("info", message, metadata, correlationId);
  }

  public async warn(message: string, metadata: LogMetadata = {}, correlationId?: string): Promise<void> {
    await this.log("warn", message, metadata, correlationId);
  }

  public async error(message: string, metadata: LogMetadata = {}, correlationId?: string): Promise<void> {
    await this.log("error", message, metadata, correlationId);
  }

  public async fatal(message: string, metadata: LogMetadata = {}, correlationId?: string): Promise<void> {
    await this.log("fatal", message, metadata, correlationId);
  }

  public async log(level: LogLevel, message: string, metadata: LogMetadata = {}, correlationId?: string): Promise<void> {
    const event: LogEvent = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      level,
      message,
      correlationId,
      moduleId: this.options.moduleId,
      metadata: {
        ...(this.options.staticMetadata ?? {}),
        ...metadata
      }
    };

    if (!shouldLogEvent(event, this.options.filter)) {
      return;
    }

    await Promise.all(this.options.sinks.map((sink) => sink.write(event)));

    if (this.options.eventWriter) {
      await this.options.eventWriter.write(event);
    }

    if (this.options.decisionWriter) {
      await this.options.decisionWriter.write({
        id: randomUUID(),
        timestamp: event.timestamp,
        correlationId: event.correlationId,
        decision: `logged:${event.level}`,
        reason: "event-persisted",
        metadata: {
          eventId: event.id,
          sinkCount: this.options.sinks.length
        }
      });
    }
  }

  public async decision(
    decision: string,
    reason: string,
    metadata: LogMetadata = {},
    correlationId?: string
  ): Promise<void> {
    if (!this.options.decisionWriter) {
      return;
    }

    const payload: LogDecision = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      correlationId,
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
