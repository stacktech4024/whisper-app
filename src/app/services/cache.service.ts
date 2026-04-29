import { Injectable, inject } from '@angular/core';
import { Storage } from '@ionic/storage-angular';

interface CacheEntry<T> {
  ts: number;  // timestamp (ms)
  data: T;
}

const TTL = 12 * 60 * 60 * 1000; // 12 hours

@Injectable({ providedIn: 'root' })
export class CacheService {
  private storage = inject(Storage);
  private ready = this.storage.create();  // ensure driver ready

  /** Get cached data or null if missing / expired */
  async get<T = any>(key: string): Promise<T | null> {
    await this.ready;
    const entry = (await this.storage.get(key)) as CacheEntry<T> | null;
    if (!entry) { return null; }
    return Date.now() - entry.ts < TTL ? entry.data : null;
  }

  /** Save data */
  async set<T = any>(key: string, data: T): Promise<void> {
    await this.ready;
    const entry: CacheEntry<T> = { ts: Date.now(), data };
    await this.storage.set(key, entry);
  }

  /** Clear all cached data */
  async clear(): Promise<void> {
    await this.ready;
    await this.storage.clear();
  }
}