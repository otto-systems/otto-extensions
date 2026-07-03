import { stat, rename, unlink } from "node:fs/promises";
import { dirname, basename, join } from "node:path";

import type { FileRotationPolicy } from "./types.js";

export async function rotateFileIfNeeded(filePath: string, policy: FileRotationPolicy): Promise<void> {
  const currentSize = await getFileSize(filePath);
  if (currentSize < policy.maxBytes) {
    return;
  }

  const dir = dirname(filePath);
  const base = basename(filePath);

  await removeIfExists(join(dir, `${base}.${policy.maxArchivedFiles}`));

  for (let index = policy.maxArchivedFiles - 1; index >= 1; index -= 1) {
    const source = join(dir, `${base}.${index}`);
    const target = join(dir, `${base}.${index + 1}`);
    await renameIfExists(source, target);
  }

  await renameIfExists(filePath, join(dir, `${base}.1`));
}

async function getFileSize(filePath: string): Promise<number> {
  try {
    const fileStats = await stat(filePath);
    return fileStats.size;
  } catch {
    return 0;
  }
}

async function renameIfExists(source: string, target: string): Promise<void> {
  try {
    await rename(source, target);
  } catch {
    return;
  }
}

async function removeIfExists(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
  } catch {
    return;
  }
}
