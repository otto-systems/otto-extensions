import { onLoad, onStart, onStop } from "./lifecycle.js";

export const manifestPath = new URL("./manifest.json", import.meta.url).pathname;

export const lifecycle = {
  onLoad,
  onStart,
  onStop
};

export * from "./types.js";
export * from "./metrics.js";
export * from "./mempalace.js";
