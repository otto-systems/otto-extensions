declare module "node:crypto" {
  export function randomUUID(): string;
}

declare module "node:fs/promises" {
  export type FileStat = { size: number };

  export function stat(path: string): Promise<FileStat>;
  export function rename(oldPath: string, newPath: string): Promise<void>;
  export function unlink(path: string): Promise<void>;
  export function mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  export function appendFile(path: string, data: string, encoding?: string): Promise<void>;
  export function writeFile(path: string, data: string, encoding?: string): Promise<void>;
}

declare module "node:path" {
  export function dirname(path: string): string;
  export function basename(path: string): string;
  export function join(...paths: string[]): string;
}
