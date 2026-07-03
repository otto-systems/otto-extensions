import { describe, expect, it } from "vitest";

import * as example from "../modules/example/index.js";
import * as logging from "../modules/logging/index.js";
import * as tracing from "../modules/tracing/index.js";
import * as metrics from "../modules/metrics/index.js";

describe("extensions module exports", () => {
  it("exports manifest paths for all built-in modules", () => {
    expect(example.manifestPath.endsWith("manifest.json")).toBe(true);
    expect(logging.manifestPath.endsWith("manifest.json")).toBe(true);
    expect(tracing.manifestPath.endsWith("manifest.json")).toBe(true);
    expect(metrics.manifestPath.endsWith("manifest.json")).toBe(true);
  });

  it("exports lifecycle hooks for logging/tracing/metrics", () => {
    expect(typeof logging.lifecycle.onStart).toBe("function");
    expect(typeof tracing.lifecycle.onStart).toBe("function");
    expect(typeof metrics.lifecycle.onStart).toBe("function");
  });
});
