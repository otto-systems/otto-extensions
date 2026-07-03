import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import type {
  FileSpanExporterOptions,
  MemorySpanExporterOptions,
  ServerSpanExporterOptions,
  SpanExporter,
  TraceSpan
} from "./types.js";

export class ConsoleSpanExporter implements SpanExporter {
  public readonly name = "console" as const;

  public async exportSpan(span: TraceSpan): Promise<void> {
    if (span.status === "error") {
      console.error(JSON.stringify(span));
      return;
    }
    console.log(JSON.stringify(span));
  }
}

export class FileSpanExporter implements SpanExporter {
  public readonly name = "file" as const;

  public constructor(private readonly options: FileSpanExporterOptions) {}

  public async exportSpan(span: TraceSpan): Promise<void> {
    await mkdir(dirname(this.options.filePath), { recursive: true });
    await appendFile(this.options.filePath, `${JSON.stringify(span)}\n`, "utf8");
  }
}

export class MemorySpanExporter implements SpanExporter {
  public readonly name = "memory" as const;
  private readonly spans: TraceSpan[] = [];

  public constructor(private readonly options: MemorySpanExporterOptions = {}) {}

  public async exportSpan(span: TraceSpan): Promise<void> {
    this.spans.push(span);
    const maxEntries = this.options.maxEntries ?? 5000;
    if (this.spans.length > maxEntries) {
      this.spans.splice(0, this.spans.length - maxEntries);
    }
  }

  public readAll(): TraceSpan[] {
    return [...this.spans];
  }

  public clear(): void {
    this.spans.splice(0, this.spans.length);
  }
}

export class ServerSpanExporter implements SpanExporter {
  public readonly name = "server" as const;

  public constructor(private readonly options: ServerSpanExporterOptions) {}

  public async exportSpan(span: TraceSpan): Promise<void> {
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
        body: JSON.stringify(span),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}
