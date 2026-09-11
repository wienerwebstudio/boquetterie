import fs from "node:fs/promises";
import path from "node:path";
import type { DocumentStore, StoreKind } from "./types";

/**
 * File-based store: `/content/<name>.json` (versioned) and `/data/<name>.json`
 * (runtime, git-ignored). Reads are cached per file and validated against the
 * file's mtime, so external edits (git pull, editor) are picked up immediately.
 * Writes are atomic (temp file + rename).
 */
const DIRS: Record<StoreKind, string> = {
  content: path.join(process.cwd(), "content"),
  data: path.join(process.cwd(), "data"),
};

type CacheEntry = { mtimeMs: number; value: unknown };

function isMissing(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "ENOENT";
}

export class JsonStore implements DocumentStore {
  readonly name = "json" as const;
  private cache = new Map<string, CacheEntry>();

  private file(kind: StoreKind, name: string) {
    if (!/^[a-z0-9][a-z0-9_-]*$/i.test(name)) throw new Error(`Invalid document name "${name}"`);
    return path.join(DIRS[kind], `${name}.json`);
  }

  async get<T>(kind: StoreKind, name: string): Promise<T | null> {
    const file = this.file(kind, name);
    let mtimeMs: number;
    try {
      mtimeMs = (await fs.stat(file)).mtimeMs;
    } catch (err) {
      if (isMissing(err)) return null;
      throw err;
    }
    const hit = this.cache.get(file);
    if (hit && hit.mtimeMs === mtimeMs) return hit.value as T;
    const raw = await fs.readFile(file, "utf8");
    const value = JSON.parse(raw) as T;
    this.cache.set(file, { mtimeMs, value });
    return value;
  }

  async set(kind: StoreKind, name: string, value: unknown): Promise<void> {
    const file = this.file(kind, name);
    await fs.mkdir(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
    try {
      await fs.writeFile(tmp, JSON.stringify(value, null, 2) + "\n", "utf8");
      await fs.rename(tmp, file);
    } catch (err) {
      await fs.rm(tmp, { force: true }).catch(() => undefined);
      throw err;
    } finally {
      this.cache.delete(file);
    }
  }
}

export const jsonStore = new JsonStore();
