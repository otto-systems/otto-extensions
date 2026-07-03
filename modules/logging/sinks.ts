import { mkdir, appendFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { rotateFileIfNeeded } from "./rotation.js";
import type {
  FileSinkOptions,
  LogDecision,
  LogEvent,
  LogSink,
  MemorySinkOptions,
  ServerSinkOptions
} from "./types.js";

export class ConsoleSink implements LogSink {
  public readonly name = "console" as const;

  public async write(event: LogEvent): Promise<void> {
    const payload = JSON.stringify(event);
    if (event.level === "error" || event.level === "fatal") {
      console.error(payload);
      return;
    }
    if (event.level === "warn") {
      console.warn(payload);
      return;
    }
    console.log(payload);
  }
}

export class FileSink implements LogSink {
  public readonly name = "file" as const;

  public constructor(private readonly options: FileSinkOptions) {}

  public async write(event: LogEvent): Promise<void> {
    await mkdir(dirname(this.options.filePath), { recursive: true });
    await rotateFileIfNeeded(this.options.filePath, this.options.rotation);
    await appendFile(this.options.filePath, `${JSON.stringify(event)}\n`, "utf8");
  }
}

export class MemorySink implements LogSink {
  public readonly name = "memory" as const;
  private readonly entries: LogEvent[] = [];

  public constructor(private readonly options: MemorySinkOptions = {}) {}

  public async write(event: LogEvent): Promise<void> {
    this.entries.push(event);
    const maxEntries = this.options.maxEntries ?? 1000;
    if (this.entries.length > maxEntries) {
      this.entries.splice(0, this.entries.length - maxEntries);
    }
  }

  public readAll(): LogEvent[] {
    return [...this.entries];
  }

  public clear(): void {
    this.entries.splice(0, this.entries.length);
  }
}

export class ServerSink implements LogSink {
  public readonly name = "server" as const;

  public constructor(private readonly options: ServerSinkOptions) {}

  public async write(event: LogEvent): Promise<void> {
    const controller = new AbortController();
    const timeoutMs = this.options.timeoutMs ?? 4000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      await fetch(this.options.endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(this.options.apiKey ? { authorization: `Bearer ${this.options.apiKey}` } : {})
        },
        body: JSON.stringify(event),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}

export type MemPalaceWriter = {
  writeSchema(schema: Record<string, unknown>): Promise<void>;
  writeEvent(event: LogEvent): Promise<void>;
  writeDecision(decision: LogDecision): Promise<void>;
};

export function createMemPalaceWriter(basePath: string): MemPalaceWriter {
  const schemaPath = `${basePath}/log-schema.json`;
  const eventsPath = `${basePath}/log-events.jsonl`;
  const decisionsPath = `${basePath}/log-decisions.jsonl`;

  return {
    async writeSchema(schema: Record<string, unknown>): Promise<void> {
      await mkdir(basePath, { recursive: true });
      await writeFile(schemaPath, `${JSON.stringify(schema, null, 2)}\n`, "utf8");
    },
    async writeEvent(event: LogEvent): Promise<void> {
      await mkdir(basePath, { recursive: true });
      await appendFile(eventsPath, `${JSON.stringify(event)}\n`, "utf8");
    },
    async writeDecision(decision: LogDecision): Promise<void> {
      await mkdir(basePath, { recursive: true });
      await appendFile(decisionsPath, `${JSON.stringify(decision)}\n`, "utf8");
    }
  };
}
