/** Tiny dot-path helpers used by the schema driven forms (pure, isomorphic). */

export type Json = Record<string, unknown>;

export function getPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc === null || acc === undefined) return undefined;
    return (acc as Json)[key];
  }, obj);
}

/** Immutable set – returns a shallow-copied object along the path. */
export function setPath<T>(obj: T, path: string, value: unknown): T {
  const keys = path.split(".");
  const walk = (node: unknown, i: number): unknown => {
    const key = keys[i];
    const base = node && typeof node === "object" && !Array.isArray(node) ? { ...(node as Json) } : {};
    if (i === keys.length - 1) {
      if (value === undefined) delete base[key];
      else base[key] = value;
      return base;
    }
    base[key] = walk(base[key], i + 1);
    return base;
  };
  return walk(obj, 0) as T;
}

export function isPlainObject(v: unknown): v is Json {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

/**
 * Remove `undefined` and empty strings recursively (arrays are kept, their
 * `undefined` entries dropped). Keeps `null`, numbers and booleans.
 * Objects that end up empty are only removed at the given dot-path patterns
 * (array items are written as `*`, e.g. `sections.*.image`) – other empty
 * objects (e.g. `brand.social`) stay because the storefront expects them.
 */
export function cleanEmpty<T>(value: T, removeEmptyObjectsAt: string[] = []): T {
  const removable = new Set(removeEmptyObjectsAt);
  const walk = (v: unknown, path: string): unknown => {
    if (Array.isArray(v)) return v.map((x) => walk(x, path ? `${path}.*` : "*")).filter((x) => x !== undefined);
    if (isPlainObject(v)) {
      const out: Json = {};
      for (const [k, val] of Object.entries(v)) {
        const childPath = path ? `${path}.${k}` : k;
        const cleaned = walk(val, childPath);
        if (cleaned === undefined) continue;
        if (isPlainObject(cleaned) && Object.keys(cleaned).length === 0 && removable.has(childPath)) continue;
        out[k] = cleaned;
      }
      return out;
    }
    if (typeof v === "string" && v.trim() === "") return undefined;
    return v;
  };
  const result = walk(value, "");
  return (result === undefined ? {} : result) as T;
}
