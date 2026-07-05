import { onLoad, onStart, onStop } from "./lifecycle.js";
import { loadCommandSchemas, type CommandSchema } from "@otto/command-service";

export const manifestPath = new URL("./manifest.json", import.meta.url).pathname;

export const lifecycle = {
  onLoad,
  onStart,
  onStop
};

export async function getExtensionCommandSchemas(): Promise<CommandSchema[]> {
  return loadCommandSchemas();
}
