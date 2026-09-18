/**
 * Stockage : Netlify Blobs en production, système de fichiers (.data/) en local.
 *
 * Stores (ARCHITECTURE.md) :
 *   candidates  YYYY-MM-DD  → 10 candidates + preuves (privé)
 *   published   YYYY-MM-DD  → 5 retenues + preuves (public en lecture via api-news)
 *   views       <id>        → entier
 *   subscribers <hash>      → email, confirmation, tokens (privé)
 *   state       recent-topics, published-dates, email-pending …
 *   reports     YYYY-MM-DD  → rapport du pipeline (privé)
 *   tokens      <token>     → hash d'abonné (confirmation / désabonnement)
 */
import { getStore, type Store } from "@netlify/blobs";
import { mkdir, readFile, writeFile, unlink, readdir } from "node:fs/promises";
import path from "node:path";

export type StoreName = "candidates" | "published" | "views" | "subscribers" | "state" | "reports" | "tokens";

export interface KV {
  getJSON<T>(store: StoreName, key: string): Promise<T | null>;
  setJSON(store: StoreName, key: string, value: unknown): Promise<void>;
  delete(store: StoreName, key: string): Promise<void>;
  list(store: StoreName, prefix?: string): Promise<string[]>;
}

function blobsAvailable(): boolean {
  if (process.env.TGN_STORAGE === "fs") return false;
  if (process.env.NETLIFY_BLOBS_CONTEXT) return true;
  if (process.env.NETLIFY_SITE_ID && (process.env.NETLIFY_TOKEN || process.env.NETLIFY_AUTH_TOKEN)) return true;
  return false;
}

class BlobsKV implements KV {
  private stores = new Map<string, Store>();
  private store(name: StoreName): Store {
    let s = this.stores.get(name);
    if (!s) {
      const siteID = process.env.NETLIFY_SITE_ID;
      const token = process.env.NETLIFY_TOKEN || process.env.NETLIFY_AUTH_TOKEN;
      s = process.env.NETLIFY_BLOBS_CONTEXT || !siteID || !token
        ? getStore({ name, consistency: "strong" })
        : getStore({ name, siteID, token, consistency: "strong" });
      this.stores.set(name, s);
    }
    return s;
  }
  async getJSON<T>(store: StoreName, key: string): Promise<T | null> {
    const v = await this.store(store).get(key, { type: "json" });
    return (v ?? null) as T | null;
  }
  async setJSON(store: StoreName, key: string, value: unknown): Promise<void> {
    await this.store(store).setJSON(key, value);
  }
  async delete(store: StoreName, key: string): Promise<void> {
    await this.store(store).delete(key);
  }
  async list(store: StoreName, prefix?: string): Promise<string[]> {
    const { blobs } = await this.store(store).list(prefix ? { prefix } : {});
    return blobs.map((b) => b.key).sort();
  }
}

class FsKV implements KV {
  private root: string;
  constructor(root: string) { this.root = root; }
  private file(store: StoreName, key: string) {
    return path.join(this.root, store, encodeURIComponent(key) + ".json");
  }
  async getJSON<T>(store: StoreName, key: string): Promise<T | null> {
    try {
      return JSON.parse(await readFile(this.file(store, key), "utf8")) as T;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw e;
    }
  }
  async setJSON(store: StoreName, key: string, value: unknown): Promise<void> {
    const f = this.file(store, key);
    await mkdir(path.dirname(f), { recursive: true });
    await writeFile(f, JSON.stringify(value, null, 2));
  }
  async delete(store: StoreName, key: string): Promise<void> {
    try { await unlink(this.file(store, key)); } catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; }
  }
  async list(store: StoreName, prefix?: string): Promise<string[]> {
    try {
      const names = await readdir(path.join(this.root, store));
      return names.filter((n) => n.endsWith(".json")).map((n) => decodeURIComponent(n.slice(0, -5))).filter((k) => !prefix || k.startsWith(prefix)).sort();
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw e;
    }
  }
}

/** Stockage « lecture seule » pour les --dry-run : lit le vrai stockage, n'écrit jamais. */
class ReadOnlyKV implements KV {
  public writes: Array<{ store: StoreName; key: string }> = [];
  private inner: KV;
  constructor(inner: KV) { this.inner = inner; }
  getJSON<T>(store: StoreName, key: string) { return this.inner.getJSON<T>(store, key); }
  async setJSON(store: StoreName, key: string) { this.writes.push({ store, key }); }
  async delete(store: StoreName, key: string) { this.writes.push({ store, key }); }
  list(store: StoreName, prefix?: string) { return this.inner.list(store, prefix); }
}

let singleton: KV | null = null;
export function storage(): KV {
  if (!singleton) {
    singleton = blobsAvailable() ? new BlobsKV() : new FsKV(process.env.TGN_DATA_DIR || path.resolve(process.cwd(), ".data"));
  }
  return singleton;
}
export function storageBackend(): "blobs" | "fs" { return blobsAvailable() ? "blobs" : "fs"; }
export function readOnly(kv: KV): ReadOnlyKV { return new ReadOnlyKV(kv); }
